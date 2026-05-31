// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

// --- Interfaces ---

interface ILandNFT {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function getLandToken(uint256 landId) external view returns (uint256);
    function getLandIdByToken(uint256 tokenId) external view returns (uint256); // Assume we can fetch landId from tokenId
}

interface ILandRegistry {
    function transferOwnership(uint256 landId, address newOwner) external;
}

interface IEscrow {
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

    function createEscrow(uint256 tokenId, address payable seller) external payable returns (uint256);
    function getEscrowDetails(uint256 escrowId) external view returns (EscrowTx memory);
}

/**
 * @title Marketplace
 * @author LandVerse Development Team
 * @notice Primary platform marketplace enabling buyers and sellers to list, cancel,
 * and purchase land NFTs with trustless, verifier-enforced escrow safety.
 */
contract Marketplace is AccessControl, ReentrancyGuard, Pausable {
    // --- Structures ---
    struct Listing {
        uint256 listingId;
        uint256 tokenId;
        address payable seller;
        uint256 price;
        bool active;
        uint256 escrowId;
        address payable pendingBuyer;
    }

    // --- State Variables ---
    ILandNFT public immutable landNFT;
    ILandRegistry public immutable landRegistry;
    IEscrow public immutable escrow;

    uint256 private _nextListingId = 1;

    // Mapping from listingId to Listing struct
    mapping(uint256 => Listing) private _listings;

    // Mapping from tokenId to listingId to prevent concurrent duplicate listings
    mapping(uint256 => uint256) private _activeListingsByToken;

    // --- Custom Errors ---
    error Marketplace__ZeroAddress();
    error Marketplace__InvalidPrice();
    error Marketplace__NotNFTOwner();
    error Marketplace__ListingNotActive();
    error Marketplace__NotSeller();
    error Marketplace__IncorrectPayment();
    error Marketplace__SaleNotReady();
    error Marketplace__ListingAlreadyActive();
    error Marketplace__TokenEscrowed();

    // --- Events ---
    event ListingCreated(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed listingId, uint256 indexed tokenId);
    event PriceUpdated(uint256 indexed listingId, uint256 indexed tokenId, uint256 newPrice);
    event NFTPurchased(uint256 indexed listingId, uint256 indexed tokenId, address indexed buyer, uint256 escrowId);
    event SaleCompleted(uint256 indexed listingId, uint256 indexed tokenId, address indexed buyer);

    /**
     * @notice Constructor initializes dependencies and the admin role.
     */
    constructor(address nftAddress, address registryAddress, address escrowAddress, address admin) {
        if (nftAddress == address(0) || registryAddress == address(0) || escrowAddress == address(0)) {
            revert Marketplace__ZeroAddress();
        }
        if (admin == address(0)) revert Marketplace__ZeroAddress();

        landNFT = ILandNFT(nftAddress);
        landRegistry = ILandRegistry(registryAddress);
        escrow = IEscrow(escrowAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // --- External Write Functions ---

    /**
     * @notice Creates a new marketplace listing for an NFT.
     * @param tokenId The unique ID of the land NFT.
     * @param price Listing price in Wei.
     * @return The newly generated listing ID.
     */
    function createListing(
        uint256 tokenId,
        uint256 price
    ) external whenNotPaused nonReentrant returns (uint256) {
        if (price == 0) revert Marketplace__InvalidPrice();
        if (landNFT.ownerOf(tokenId) != msg.sender) revert Marketplace__NotNFTOwner();
        if (_activeListingsByToken[tokenId] != 0) revert Marketplace__ListingAlreadyActive();

        uint256 listingId = _nextListingId++;

        _listings[listingId] = Listing({
            listingId: listingId,
            tokenId: tokenId,
            seller: payable(msg.sender),
            price: price,
            active: true,
            escrowId: 0,
            pendingBuyer: payable(address(0))
        });

        _activeListingsByToken[tokenId] = listingId;

        emit ListingCreated(listingId, tokenId, msg.sender, price);

        return listingId;
    }

    /**
     * @notice Cancels an active listing. Only callable by the seller.
     * @param listingId The listing ID.
     */
    function cancelListing(uint256 listingId) external whenNotPaused nonReentrant {
        Listing storage listing = _listings[listingId];
        if (!listing.active) revert Marketplace__ListingNotActive();
        if (listing.seller != msg.sender) revert Marketplace__NotSeller();
        if (listing.escrowId != 0) revert Marketplace__TokenEscrowed();

        listing.active = false;
        delete _activeListingsByToken[listing.tokenId];

        emit ListingCancelled(listingId, listing.tokenId);
    }

    /**
     * @notice Updates the price of an active listing. Only callable by the seller.
     * @param listingId The listing ID.
     * @param newPrice The new price in Wei.
     */
    function updatePrice(uint256 listingId, uint256 newPrice) external whenNotPaused nonReentrant {
        if (newPrice == 0) revert Marketplace__InvalidPrice();
        Listing storage listing = _listings[listingId];
        if (!listing.active) revert Marketplace__ListingNotActive();
        if (listing.seller != msg.sender) revert Marketplace__NotSeller();
        if (listing.escrowId != 0) revert Marketplace__TokenEscrowed();

        listing.price = newPrice;

        emit PriceUpdated(listingId, listing.tokenId, newPrice);
    }

    /**
     * @notice Initiates a purchase by locking the NFT in this contract and creating an escrow with the ETH.
     * @param listingId The listing ID.
     */
    function buyNFT(uint256 listingId) external payable whenNotPaused nonReentrant {
        Listing storage listing = _listings[listingId];
        if (!listing.active) revert Marketplace__ListingNotActive();
        if (msg.value != listing.price) revert Marketplace__IncorrectPayment();
        if (listing.escrowId != 0) revert Marketplace__TokenEscrowed();

        listing.pendingBuyer = payable(msg.sender);

        // Forward the received ETH to create a secure Escrow record first while the seller still owns the NFT
        // The Marketplace contract will be the 'buyer' inside Escrow, holding the NFT
        uint256 escrowId = escrow.createEscrow{value: msg.value}(listing.tokenId, listing.seller);
        listing.escrowId = escrowId;

        // Lock the NFT inside this Marketplace contract (requires approval from the seller)
        landNFT.transferFrom(listing.seller, address(this), listing.tokenId);

        emit NFTPurchased(listingId, listing.tokenId, msg.sender, escrowId);
    }

    /**
     * @notice Completes a sale after verifiers approve the ownership transfer inside Escrow.
     * @dev Transfers NFT to the pending buyer, transfers land record in LandRegistry, and closes listing.
     * Can be called by anyone once the escrow terms are fully resolved/completed on-chain.
     * @param listingId The listing ID.
     */
    function completeSale(uint256 listingId) external whenNotPaused nonReentrant {
        Listing storage listing = _listings[listingId];
        if (listing.escrowId == 0) revert Marketplace__SaleNotReady();

        // Fetch Escrow Details to verify completion status
        IEscrow.EscrowTx memory escrowTx = escrow.getEscrowDetails(listing.escrowId);

        // Sale is only fully completed once the escrow verifier has approved and funds are either released or verified
        if (!escrowTx.verified && !escrowTx.completed) revert Marketplace__SaleNotReady();

        // If it got refunded, we shouldn't complete it
        if (escrowTx.refunded) revert Marketplace__SaleNotReady();

        uint256 tokenId = listing.tokenId;
        address buyer = listing.pendingBuyer;

        // Mark listing inactive
        listing.active = false;
        delete _listings[listingId];
        delete _activeListingsByToken[tokenId];

        // 1. Transfer the locked NFT from this contract to the human buyer
        landNFT.transferFrom(address(this), buyer, tokenId);

        // 2. Sync / Update LandRegistry land ownership (The Marketplace must be approved in Registry to do this)
        // Since the seller previously authorized the listing, we perform the registry update now
        uint256 landId = tokenId; // 1-to-1 tokenId mapping to landId
        landRegistry.transferOwnership(landId, buyer);

        emit SaleCompleted(listingId, tokenId, buyer);
    }

    // --- External View Functions ---

    /**
     * @notice Returns details of a specific listing.
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        Listing memory listing = _listings[listingId];
        if (listing.listingId == 0 || !listing.active) revert Marketplace__ListingNotActive();
        return listing;
    }

    /**
     * @notice Returns all active listing IDs in a dynamic array.
     */
    function getActiveListings() external view returns (Listing[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i < _nextListingId; i++) {
            if (_listings[i].active && _listings[i].escrowId == 0) {
                activeCount++;
            }
        }

        Listing[] memory activeListings = new Listing[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i < _nextListingId; i++) {
            if (_listings[i].active && _listings[i].escrowId == 0) {
                activeListings[index] = _listings[i];
                index++;
            }
        }

        return activeListings;
    }

    /**
     * @notice Pauses contract functions.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses contract functions.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
