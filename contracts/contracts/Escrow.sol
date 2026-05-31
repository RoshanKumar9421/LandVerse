// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ILandNFT
 * @dev Interface to interact with LandNFT contract for verifying token ownership.
 */
interface ILandNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title Escrow
 * @author LandVerse Development Team
 * @notice Securely holds buyer funds (ETH) for property transactions,
 * releasing payment to the seller only after authorized verifiers confirm NFT ownership transfer.
 * Supports secure administrative and verifier-approved refund flows.
 */
contract Escrow is AccessControl, ReentrancyGuard, Pausable {
    // --- Roles ---
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // --- Structures ---
    struct EscrowTx {
        uint256 escrowId;
        uint256 tokenId;
        address payable buyer;
        address payable seller;
        uint256 amount;
        bool verified;
        bool completed;
        bool refunded;
    }

    // --- State Variables ---
    ILandNFT public immutable landNFT;
    uint256 private _nextEscrowId = 1;

    // Mapping from escrowId to EscrowTx struct
    mapping(uint256 => EscrowTx) private _escrows;

    // --- Custom Errors ---
    error Escrow__NFTZeroAddress();
    error Escrow__InvalidAmount();
    error Escrow__InvalidAddress();
    error Escrow__EscrowDoesNotExist(uint256 escrowId);
    error Escrow__EscrowAlreadyCompleted(uint256 escrowId);
    error Escrow__EscrowAlreadyRefunded(uint256 escrowId);
    error Escrow__EscrowAlreadyVerified(uint256 escrowId);
    error Escrow__EscrowNotVerified(uint256 escrowId);
    error Escrow__SellerNotNFTOwner(uint256 tokenId, address seller);
    error Escrow__OwnershipTransferNotOccurred(uint256 tokenId, address buyer);
    error Escrow__TransferFailed();

    // --- Events ---
    event EscrowCreated(
        uint256 indexed escrowId,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 amount
    );
    event TransferVerified(uint256 indexed escrowId, uint256 indexed tokenId, address indexed verifier);
    event FundsReleased(uint256 indexed escrowId, address indexed seller, uint256 amount);
    event BuyerRefunded(uint256 indexed escrowId, address indexed buyer, uint256 amount);

    /**
     * @notice Constructor initializes the Escrow contract, roles, and LandNFT address.
     * @param nftAddress Deployed address of the LandNFT contract.
     * @param admin Initial administrator address.
     */
    constructor(address nftAddress, address admin) {
        if (nftAddress == address(0)) revert Escrow__NFTZeroAddress();
        if (admin == address(0)) revert Escrow__InvalidAddress();

        landNFT = ILandNFT(nftAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);
    }

    // --- External Write Functions ---

    /**
     * @notice Creates an escrow record and locks incoming ETH from the buyer.
     * @dev Validates that the seller is the current owner of the specified NFT.
     * @param tokenId The unique ERC-721 token ID of the land.
     * @param seller The address of the property seller.
     * @return The newly generated unique escrow ID.
     */
    function createEscrow(
        uint256 tokenId,
        address payable seller
    ) external payable whenNotPaused nonReentrant returns (uint256) {
        if (msg.value == 0) revert Escrow__InvalidAmount();
        if (seller == address(0) || seller == msg.sender) revert Escrow__InvalidAddress();

        // Security check: Verify that the seller currently owns the NFT being sold
        if (landNFT.ownerOf(tokenId) != seller) {
            revert Escrow__SellerNotNFTOwner(tokenId, seller);
        }

        uint256 escrowId = _nextEscrowId++;

        _escrows[escrowId] = EscrowTx({
            escrowId: escrowId,
            tokenId: tokenId,
            buyer: payable(msg.sender),
            seller: seller,
            amount: msg.value,
            verified: false,
            completed: false,
            refunded: false
        });

        emit EscrowCreated(escrowId, tokenId, msg.sender, seller, msg.value);

        return escrowId;
    }

    /**
     * @notice Verifies the ownership transfer of the property NFT from seller to buyer.
     * @dev Restricted to accounts with VERIFIER_ROLE. Validates on-chain ownership in LandNFT contract.
     * @param escrowId The unique ID of the escrow record.
     */
    function verifyTransfer(uint256 escrowId) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        EscrowTx storage transaction = _escrows[escrowId];
        if (transaction.escrowId == 0) revert Escrow__EscrowDoesNotExist(escrowId);
        if (transaction.completed) revert Escrow__EscrowAlreadyCompleted(escrowId);
        if (transaction.refunded) revert Escrow__EscrowAlreadyRefunded(escrowId);
        if (transaction.verified) revert Escrow__EscrowAlreadyVerified(escrowId);

        // Security check: Verify that the ownership transfer has successfully completed on-chain
        if (landNFT.ownerOf(transaction.tokenId) != transaction.buyer) {
            revert Escrow__OwnershipTransferNotOccurred(transaction.tokenId, transaction.buyer);
        }

        transaction.verified = true;

        emit TransferVerified(escrowId, transaction.tokenId, msg.sender);
    }

    /**
     * @notice Releases locked escrow funds to the seller.
     * @dev Reverts if the ownership transfer has not been officially verified.
     * @param escrowId The unique ID of the escrow record.
     */
    function releaseFunds(uint256 escrowId) external whenNotPaused nonReentrant {
        EscrowTx storage transaction = _escrows[escrowId];
        if (transaction.escrowId == 0) revert Escrow__EscrowDoesNotExist(escrowId);
        if (transaction.completed) revert Escrow__EscrowAlreadyCompleted(escrowId);
        if (transaction.refunded) revert Escrow__EscrowAlreadyRefunded(escrowId);
        if (!transaction.verified) revert Escrow__EscrowNotVerified(escrowId);

        transaction.completed = true;
        uint256 amount = transaction.amount;
        address payable seller = transaction.seller;

        // Perform transfer
        (bool success, ) = seller.call{value: amount}("");
        if (!success) revert Escrow__TransferFailed();

        emit FundsReleased(escrowId, seller, amount);
    }

    /**
     * @notice Refunds the locked escrow funds back to the buyer.
     * @dev Restricted to VERIFIER_ROLE to prevent unilateral extraction or bad-faith cancellations.
     * Reverts if transaction is already completed or refunded.
     * @param escrowId The unique ID of the escrow record.
     */
    function refundBuyer(uint256 escrowId) external onlyRole(VERIFIER_ROLE) whenNotPaused nonReentrant {
        EscrowTx storage transaction = _escrows[escrowId];
        if (transaction.escrowId == 0) revert Escrow__EscrowDoesNotExist(escrowId);
        if (transaction.completed) revert Escrow__EscrowAlreadyCompleted(escrowId);
        if (transaction.refunded) revert Escrow__EscrowAlreadyRefunded(escrowId);

        transaction.refunded = true;
        uint256 amount = transaction.amount;
        address payable buyer = transaction.buyer;

        // Perform transfer
        (bool success, ) = buyer.call{value: amount}("");
        if (!success) revert Escrow__TransferFailed();

        emit BuyerRefunded(escrowId, buyer, amount);
    }

    /**
     * @notice Pauses contract functions in case of emergency.
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
     * @notice Returns complete metadata information for a given escrow record.
     * @param escrowId The unique escrow ID to query.
     * @return The EscrowTx struct.
     */
    function getEscrowDetails(uint256 escrowId) external view returns (EscrowTx memory) {
        EscrowTx memory transaction = _escrows[escrowId];
        if (transaction.escrowId == 0) revert Escrow__EscrowDoesNotExist(escrowId);
        return transaction;
    }

    /**
     * @dev Reverts if Native ETH is sent directly to this contract to prevent accidental locked funds.
     */
    receive() external payable {
        revert Escrow__InvalidAmount();
    }
}
