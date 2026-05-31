// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LandRegistry
 * @author LandVerse Development Team
 * @notice Stores official land records, registers ownership, performs authority verification,
 * and maintains metadata before NFT minting.
 * @dev Utilizes AccessControl, ReentrancyGuard, and Pausable frameworks.
 */
contract LandRegistry is AccessControl, ReentrancyGuard, Pausable {
    // --- Roles ---
    bytes32 public constant AUTHORITY_ROLE = keccak256("AUTHORITY_ROLE");

    // --- Structures ---
    struct Land {
        uint256 landId;
        string surveyNumber;
        string plotNumber;
        string landAddress;
        uint256 area;
        string titleDeedURI;
        string ownershipProofURI;
        string geoLocationURI;
        address owner;
        bool verified;
        bool exists;
    }

    // --- State Variables ---
    uint256 private _nextLandId = 1;

    // Mapping from land ID to Land details
    mapping(uint256 => Land) private _lands;

    // Mapping to track if a survey number has been registered to prevent duplicates
    mapping(string => bool) private _surveyNumberExists;

    // Mapping from user address to their array of land IDs
    mapping(address => uint256[]) private _userLands;

    // Mapping from land ID to its index in the owner's _userLands array
    mapping(uint256 => uint256) private _userLandIndex;

    // Mapping from land ID to approved operator address (ERC-721 integration readiness)
    mapping(uint256 => address) private _landApprovals;

    // Mapping from owner to operator approvals (ERC-721 integration readiness)
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // --- Custom Errors ---
    error LandRegistry__LandDoesNotExist(uint256 landId);
    error LandRegistry__LandAlreadyVerified(uint256 landId);
    error LandRegistry__LandNotVerified(uint256 landId);
    error LandRegistry__DuplicateSurveyNumber(string surveyNumber);
    error LandRegistry__InvalidArea();
    error LandRegistry__InvalidParameter(string paramName);
    error LandRegistry__NotOwnerOrApproved(uint256 landId);
    error LandRegistry__TransferToZeroAddress();
    error LandRegistry__AlreadyApproved(uint256 landId, address to);

    // --- Events ---
    event LandRegistered(
        uint256 indexed landId,
        address indexed owner,
        string surveyNumber,
        string plotNumber,
        uint256 area
    );
    event LandVerified(uint256 indexed landId, address indexed authority);
    event LandRejected(uint256 indexed landId, address indexed authority, string reason);
    event OwnershipTransferred(uint256 indexed landId, address indexed oldOwner, address indexed newOwner);
    event GeoLocationUpdated(uint256 indexed landId, string newGeoLocationURI);
    event Approval(address indexed owner, address indexed approved, uint256 indexed landId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    /**
     * @notice Constructor initializes AccessControl roles.
     * @param admin The address of the initial admin.
     */
    constructor(address admin) {
        if (admin == address(0)) revert LandRegistry__TransferToZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AUTHORITY_ROLE, admin);
    }

    // --- External / Public Write Functions ---

    /**
     * @notice Registers a new land record in the platform.
     * @dev Sets verified to false initially. Prevents duplicate survey numbers.
     * @param surveyNumber Unique official land survey identifier.
     * @param plotNumber Specific plot number within the survey area.
     * @param landAddress Physical description or street address of the property.
     * @param area Numeric area size of the land.
     * @param titleDeedURI URI linking to metadata of the official title deed document.
     * @param ownershipProofURI URI linking to metadata of supporting ownership proof documents.
     * @param geoLocationURI URI/JSON mapping of the GPS coordinates and boundaries of the property.
     * @return The newly generated unique landId.
     */
    function registerLand(
        string calldata surveyNumber,
        string calldata plotNumber,
        string calldata landAddress,
        uint256 area,
        string calldata titleDeedURI,
        string calldata ownershipProofURI,
        string calldata geoLocationURI
    ) external whenNotPaused nonReentrant returns (uint256) {
        if (bytes(surveyNumber).length == 0) revert LandRegistry__InvalidParameter("surveyNumber");
        if (_surveyNumberExists[surveyNumber]) revert LandRegistry__DuplicateSurveyNumber(surveyNumber);
        if (area == 0) revert LandRegistry__InvalidArea();
        if (bytes(landAddress).length == 0) revert LandRegistry__InvalidParameter("landAddress");
        if (bytes(titleDeedURI).length == 0) revert LandRegistry__InvalidParameter("titleDeedURI");
        if (bytes(ownershipProofURI).length == 0) revert LandRegistry__InvalidParameter("ownershipProofURI");
        if (bytes(geoLocationURI).length == 0) revert LandRegistry__InvalidParameter("geoLocationURI");

        uint256 landId = _nextLandId++;

        _lands[landId] = Land({
            landId: landId,
            surveyNumber: surveyNumber,
            plotNumber: plotNumber,
            landAddress: landAddress,
            area: area,
            titleDeedURI: titleDeedURI,
            ownershipProofURI: ownershipProofURI,
            geoLocationURI: geoLocationURI,
            owner: msg.sender,
            verified: false,
            exists: true
        });

        _surveyNumberExists[surveyNumber] = true;

        // Track user land mapping
        _userLands[msg.sender].push(landId);
        _userLandIndex[landId] = _userLands[msg.sender].length - 1;

        emit LandRegistered(landId, msg.sender, surveyNumber, plotNumber, area);

        return landId;
    }

    /**
     * @notice Verifies a registered land record.
     * @dev Only accessible by accounts with AUTHORITY_ROLE. Sets verified to true.
     * @param landId The unique ID of the registered land.
     */
    function verifyLand(uint256 landId) external onlyRole(AUTHORITY_ROLE) whenNotPaused nonReentrant {
        Land storage land = _lands[landId];
        if (!land.exists) revert LandRegistry__LandDoesNotExist(landId);
        if (land.verified) revert LandRegistry__LandAlreadyVerified(landId);

        land.verified = true;

        emit LandVerified(landId, msg.sender);
    }

    /**
     * @notice Rejects a pending land registration application.
     * @dev Only accessible by accounts with AUTHORITY_ROLE. Removes the land from the owner's registry
     * and releases the survey number for potential correction and re-registration.
     * @param landId The unique ID of the registered land.
     * @param reason Clarification on why the verification was rejected.
     */
    function rejectLand(
        uint256 landId,
        string calldata reason
    ) external onlyRole(AUTHORITY_ROLE) whenNotPaused nonReentrant {
        if (bytes(reason).length == 0) revert LandRegistry__InvalidParameter("reason");
        
        Land storage land = _lands[landId];
        if (!land.exists) revert LandRegistry__LandDoesNotExist(landId);
        if (land.verified) revert LandRegistry__LandAlreadyVerified(landId);

        address owner = land.owner;
        string memory surveyNumber = land.surveyNumber;

        // Release survey number to allow correction and re-registration
        delete _surveyNumberExists[surveyNumber];

        // Mark as non-existent
        land.exists = false;

        // Remove from user's land arrays
        _removeLandFromUser(owner, landId);

        // Clear approval for this specific land
        delete _landApprovals[landId];

        emit LandRejected(landId, msg.sender, reason);
    }

    /**
     * @notice Transfers ownership of a verified land record to a new address.
     * @dev Reverts if the caller is not the owner or approved spender/operator.
     * Reverts if the land has not been verified yet.
     * @param landId The unique ID of the land.
     * @param newOwner The address of the new owner.
     */
    function transferOwnership(uint256 landId, address newOwner) external whenNotPaused nonReentrant {
        Land storage land = _lands[landId];
        if (!land.exists) revert LandRegistry__LandDoesNotExist(landId);
        if (!land.verified) revert LandRegistry__LandNotVerified(landId);
        if (newOwner == address(0)) revert LandRegistry__TransferToZeroAddress();
        if (!_isApprovedOrOwner(msg.sender, landId)) revert LandRegistry__NotOwnerOrApproved(landId);

        address oldOwner = land.owner;

        // Remove from old owner's tracking array
        _removeLandFromUser(oldOwner, landId);

        // Add to new owner's tracking array
        _userLands[newOwner].push(landId);
        _userLandIndex[landId] = _userLands[newOwner].length - 1;

        // Update owner
        land.owner = newOwner;

        // Clear approval for this specific land
        delete _landApprovals[landId];

        emit OwnershipTransferred(landId, oldOwner, newOwner);
    }

    /**
     * @notice Updates the geolocation metadata URI for a land record.
     * @dev Resets the verified status to false, requiring authorities to re-verify the new boundaries.
     * Reverts if caller is not the owner or approved.
     * @param landId The unique ID of the land.
     * @param newGeoLocationURI The URI pointing to the new geolocation coordinates/polygon JSON.
     */
    function updateGeoLocation(
        uint256 landId,
        string calldata newGeoLocationURI
    ) external whenNotPaused nonReentrant {
        if (bytes(newGeoLocationURI).length == 0) revert LandRegistry__InvalidParameter("newGeoLocationURI");

        Land storage land = _lands[landId];
        if (!land.exists) revert LandRegistry__LandDoesNotExist(landId);
        if (!_isApprovedOrOwner(msg.sender, landId)) revert LandRegistry__NotOwnerOrApproved(landId);

        land.geoLocationURI = newGeoLocationURI;
        land.verified = false; // Reset verification status upon geolocation boundary change

        emit GeoLocationUpdated(landId, newGeoLocationURI);
    }

    /**
     * @notice Approve `to` address to transfer `landId`.
     * @dev Can only be called by the owner or an approved operator.
     * @param to Address to approve.
     * @param landId Land ID to approve.
     */
    function approve(address to, uint256 landId) external whenNotPaused {
        Land storage land = _lands[landId];
        if (!land.exists) revert LandRegistry__LandDoesNotExist(landId);
        
        address owner = land.owner;
        if (msg.sender != owner && !_operatorApprovals[owner][msg.sender]) {
            revert LandRegistry__NotOwnerOrApproved(landId);
        }
        if (_landApprovals[landId] == to) {
            revert LandRegistry__AlreadyApproved(landId, to);
        }

        _landApprovals[landId] = to;
        emit Approval(owner, to, landId);
    }

    /**
     * @notice Enable or disable an operator to manage all of the caller's lands.
     * @param operator Address to approve/disapprove.
     * @param approved True to approve, false to revoke approval.
     */
    function setApprovalForAll(address operator, bool approved) external whenNotPaused {
        if (operator == address(0)) revert LandRegistry__TransferToZeroAddress();
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    /**
     * @notice Pauses contract functions.
     * @dev Restricted to DEFAULT_ADMIN_ROLE.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses contract functions.
     * @dev Restricted to DEFAULT_ADMIN_ROLE.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // --- External View Functions ---

    /**
     * @notice Returns all details of a registered land.
     * @param landId The unique ID of the land.
     * @return The complete Land details struct.
     */
    function getLandDetails(uint256 landId) external view returns (Land memory) {
        Land memory land = _lands[landId];
        if (!land.exists) revert LandRegistry__LandDoesNotExist(landId);
        return land;
    }

    /**
     * @notice Returns an array of land IDs owned by the specified address.
     * @param user The address to query.
     * @return An array of land IDs.
     */
    function getUserLands(address user) external view returns (uint256[] memory) {
        return _userLands[user];
    }

    /**
     * @notice Get approved address for `landId`.
     * @param landId Land ID to query.
     */
    function getApproved(uint256 landId) external view returns (address) {
        if (!_lands[landId].exists) revert LandRegistry__LandDoesNotExist(landId);
        return _landApprovals[landId];
    }

    /**
     * @notice Get if `operator` is approved for `owner`.
     * @param owner Owner address.
     * @param operator Operator address.
     */
    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    // --- Private / Internal Helper Functions ---

    /**
     * @dev Removes a landId from the specified owner's _userLands tracking list in O(1) complexity.
     */
    function _removeLandFromUser(address user, uint256 landId) private {
        uint256[] storage lands = _userLands[user];
        uint256 index = _userLandIndex[landId];
        uint256 lastIndex = lands.length - 1;

        if (index != lastIndex) {
            uint256 lastLandId = lands[lastIndex];
            lands[index] = lastLandId;
            _userLandIndex[lastLandId] = index;
        }

        lands.pop();
        delete _userLandIndex[landId];
    }

    /**
     * @dev Checks if spender is the owner or an approved operator/spender for the landId.
     */
    function _isApprovedOrOwner(address spender, uint256 landId) internal view returns (bool) {
        address owner = _lands[landId].owner;
        return (spender == owner || _landApprovals[landId] == spender || _operatorApprovals[owner][spender]);
    }
}
