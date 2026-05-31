// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ILandRegistry
 * @dev Interface for LandRegistry contract, to fetch land detail details.
 */
interface ILandRegistry {
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

    function getLandDetails(uint256 landId) external view returns (Land memory);
}

/**
 * @title LandNFT
 * @author LandVerse Development Team
 * @notice Converts verified land records into unique ERC-721 NFTs.
 * Maintains ownership history and integrates with LandRegistry.
 */
contract LandNFT is ERC721, ERC721URIStorage, AccessControl, ReentrancyGuard, Pausable {
    // --- Roles ---
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // --- Structures ---
    struct NFTInfo {
        uint256 tokenId;
        uint256 landId;
        string metadataURI;
        address currentOwner;
        uint256 mintedTimestamp;
    }

    // --- State Variables ---
    ILandRegistry public immutable landRegistry;
    uint256 private _nextTokenId = 1;

    // Mapping from tokenId to NFTInfo
    mapping(uint256 => NFTInfo) private _nftInfos;

    // Bidirectional mappings
    mapping(uint256 => uint256) private _landIdToTokenId;
    mapping(uint256 => uint256) private _tokenIdToLandId;

    // --- Custom Errors ---
    error LandNFT__RegistryZeroAddress();
    error LandNFT__LandNotVerified(uint256 landId);
    error LandNFT__NFTAlreadyMinted(uint256 landId);
    error LandNFT__TokenDoesNotExist(uint256 tokenId);
    error LandNFT__NotTokenOwnerOrApproved(uint256 tokenId);
    error LandNFT__TransferToZeroAddress();
    error LandNFT__InvalidParameter(string paramName);

    // --- Events ---
    event NFTMinted(
        uint256 indexed tokenId,
        uint256 indexed landId,
        address indexed owner,
        string metadataURI,
        uint256 timestamp
    );
    event NFTTransferred(uint256 indexed tokenId, address indexed from, address indexed to);
    event NFTBurned(uint256 indexed tokenId, uint256 indexed landId);

    /**
     * @notice Constructor initializes the ERC-721 token, roles, and LandRegistry reference.
     * @param registryAddress Address of the deployed LandRegistry contract.
     * @param admin Initial administrator address.
     */
    constructor(address registryAddress, address admin) ERC721("LandVerse NFT", "LAND") {
        if (registryAddress == address(0)) revert LandNFT__RegistryZeroAddress();
        if (admin == address(0)) revert LandNFT__TransferToZeroAddress();

        landRegistry = ILandRegistry(registryAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    // --- External Write Functions ---

    /**
     * @notice Mints a new NFT for a verified land record.
     * @dev Only callable by accounts with MINTER_ROLE. One NFT per landId.
     * @param landId The unique land record ID from the LandRegistry.
     * @param to The recipient address of the minted NFT (usually the land owner).
     * @param metadataURI The metadata URI containing the NFT properties and assets.
     * @return The newly minted tokenId.
     */
    function mintLandNFT(
        uint256 landId,
        address to,
        string calldata metadataURI
    ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant returns (uint256) {
        if (to == address(0)) revert LandNFT__TransferToZeroAddress();
        if (bytes(metadataURI).length == 0) revert LandNFT__InvalidParameter("metadataURI");
        if (_landIdToTokenId[landId] != 0) revert LandNFT__NFTAlreadyMinted(landId);

        // Fetch land details from Registry to verify existence and verification status
        ILandRegistry.Land memory land = landRegistry.getLandDetails(landId);
        if (!land.verified) revert LandNFT__LandNotVerified(landId);

        uint256 tokenId = _nextTokenId++;

        // Update mappings
        _landIdToTokenId[landId] = tokenId;
        _tokenIdToLandId[tokenId] = landId;

        // Initialize NFTInfo (currentOwner will be set in the _update override automatically)
        _nftInfos[tokenId] = NFTInfo({
            tokenId: tokenId,
            landId: landId,
            metadataURI: metadataURI,
            currentOwner: address(0),
            mintedTimestamp: block.timestamp
        });

        // Mint token
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit NFTMinted(tokenId, landId, to, metadataURI, block.timestamp);

        return tokenId;
    }

    /**
     * @notice Safely transfers land NFT ownership from holder to another address.
     * @dev Checks if msg.sender is approved or owner.
     * @param tokenId The unique ID of the NFT to transfer.
     * @param to The recipient address.
     */
    function transferLandNFT(uint256 tokenId, address to) external whenNotPaused nonReentrant {
        if (to == address(0)) revert LandNFT__TransferToZeroAddress();
        address owner = ownerOf(tokenId);
        if (!_isAuthorized(owner, msg.sender, tokenId)) revert LandNFT__NotTokenOwnerOrApproved(tokenId);

        safeTransferFrom(owner, to, tokenId);

        emit NFTTransferred(tokenId, owner, to);
    }

    /**
     * @notice Burns an existing land NFT.
     * @dev Only DEFAULT_ADMIN_ROLE can burn tokens. Clears mappings.
     * @param tokenId The unique ID of the NFT to burn.
     */
    function burnNFT(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused nonReentrant {
        _requireOwned(tokenId); // Reverts automatically if token doesn't exist
        uint256 landId = _tokenIdToLandId[tokenId];

        // Clean up custom states/mappings
        delete _landIdToTokenId[landId];
        delete _tokenIdToLandId[tokenId];
        delete _nftInfos[tokenId];

        // Burn token
        _burn(tokenId);

        emit NFTBurned(tokenId, landId);
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

    // --- External / Public View Functions ---

    /**
     * @notice Returns the tokenId associated with the given landId.
     * @param landId The unique land ID to query.
     * @return The tokenId associated, or 0 if not minted.
     */
    function getLandToken(uint256 landId) external view returns (uint256) {
        return _landIdToTokenId[landId];
    }

    /**
     * @notice Returns complete metadata information for a given tokenId.
     * @param tokenId The unique token ID to query.
     * @return The NFTInfo struct.
     */
    function getNFTInfo(uint256 tokenId) external view returns (NFTInfo memory) {
        if (tokenId == 0 || tokenId >= _nextTokenId || _tokenIdToLandId[tokenId] == 0) {
            revert LandNFT__TokenDoesNotExist(tokenId);
        }
        return _nftInfos[tokenId];
    }

    // --- Overrides required by Solidity and OpenZeppelin ---

    /**
     * @notice Returns tokenURI for a given tokenId.
     * @dev Overrides ERC721 and ERC721URIStorage.
     */
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Overrides supportsInterface to support AccessControl and ERC721.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Internal update hook for ERC721 transitions. Keeps custom state currentOwner in sync.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        address previousOwner = super._update(to, tokenId, auth);

        if (to != address(0)) {
            _nftInfos[tokenId].currentOwner = to;
        } else {
            _nftInfos[tokenId].currentOwner = address(0);
        }

        return previousOwner;
    }
}
