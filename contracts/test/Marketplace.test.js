import { expect } from "chai";
import { network } from "hardhat";

describe("Marketplace", function () {
  let landRegistry;
  let landNFT;
  let escrow;
  let marketplace;
  let admin;
  let verifier;
  let seller;
  let buyer;
  let stranger;
  let ethers;
  let DEFAULT_ADMIN_ROLE;
  let VERIFIER_ROLE;
  let AUTHORITY_ROLE;
  let MINTER_ROLE;
  let parsedPrice;

  const surveyNumber = "SRV-77777";
  const plotNumber = "Plot-33D";
  const landAddress = "999 Blockchain Plaza, Web3 City";
  const area = 15000;
  const titleDeedURI = "ipfs://QmDeedMarket";
  const ownershipProofURI = "ipfs://QmProofMarket";
  const geoLocationURI = "ipfs://QmGeoMarket";
  const metadataURI = "ipfs://QmMarketNFTMetadata";
  const listingPrice = "2.0"; // 2 ETH

  beforeEach(async function () {
    const conn = await network.create();
    ethers = conn.ethers;

    [admin, verifier, seller, buyer, stranger] = await ethers.getSigners();
    parsedPrice = ethers.parseEther(listingPrice);

    // 1. Deploy LandRegistry
    const LandRegistryFactory = await ethers.getContractFactory("LandRegistry");
    landRegistry = await LandRegistryFactory.deploy(admin.address);

    DEFAULT_ADMIN_ROLE = await landRegistry.DEFAULT_ADMIN_ROLE();
    AUTHORITY_ROLE = await landRegistry.AUTHORITY_ROLE();
    await landRegistry.connect(admin).grantRole(AUTHORITY_ROLE, admin.address);

    // 2. Deploy LandNFT
    const LandNFTFactory = await ethers.getContractFactory("LandNFT");
    landNFT = await LandNFTFactory.deploy(await landRegistry.getAddress(), admin.address);

    MINTER_ROLE = await landNFT.MINTER_ROLE();
    await landNFT.connect(admin).grantRole(MINTER_ROLE, admin.address);

    // 3. Deploy Escrow
    const EscrowFactory = await ethers.getContractFactory("Escrow");
    escrow = await EscrowFactory.deploy(await landNFT.getAddress(), admin.address);

    VERIFIER_ROLE = await escrow.VERIFIER_ROLE();
    await escrow.connect(admin).grantRole(VERIFIER_ROLE, verifier.address);

    // 4. Deploy Marketplace referencing Registry, NFT, and Escrow
    const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
    marketplace = await MarketplaceFactory.deploy(
      await landNFT.getAddress(),
      await landRegistry.getAddress(),
      await escrow.getAddress(),
      admin.address
    );

    // 5. Setup verified Land NFT owned by seller
    await landRegistry.connect(seller).registerLand(
      surveyNumber,
      plotNumber,
      landAddress,
      area,
      titleDeedURI,
      ownershipProofURI,
      geoLocationURI
    );
    await landRegistry.connect(admin).verifyLand(1);
    await landNFT.connect(admin).mintLandNFT(1, seller.address, metadataURI);
  });

  describe("Deployment", function () {
    it("Should correctly set all referenced contract addresses and admin roles", async function () {
      expect(await marketplace.landNFT()).to.equal(await landNFT.getAddress());
      expect(await marketplace.landRegistry()).to.equal(await landRegistry.getAddress());
      expect(await marketplace.escrow()).to.equal(await escrow.getAddress());
      expect(await marketplace.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });
  });

  describe("Creating Listings", function () {
    it("Should revert on zero price listing", async function () {
      await expect(
        marketplace.connect(seller).createListing(1, 0)
      ).to.be.revertedWithCustomError(marketplace, "Marketplace__InvalidPrice");
    });

    it("Should revert if non-owner tries to list NFT", async function () {
      await expect(
        marketplace.connect(stranger).createListing(1, parsedPrice)
      ).to.be.revertedWithCustomError(marketplace, "Marketplace__NotNFTOwner");
    });

    it("Should list successfully and store correct details", async function () {
      const tx = await marketplace.connect(seller).createListing(1, parsedPrice);

      await expect(tx)
        .to.emit(marketplace, "ListingCreated")
        .withArgs(1, 1, seller.address, parsedPrice);

      const listing = await marketplace.getListing(1);
      expect(listing.listingId).to.equal(1);
      expect(listing.tokenId).to.equal(1);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(parsedPrice);
      expect(listing.active).to.be.true;
      expect(listing.escrowId).to.equal(0);
      expect(listing.pendingBuyer).to.equal(ethers.ZeroAddress);
    });

    it("Should revert if listing an already listed token", async function () {
      await marketplace.connect(seller).createListing(1, parsedPrice);

      await expect(
        marketplace.connect(seller).createListing(1, parsedPrice)
      ).to.be.revertedWithCustomError(marketplace, "Marketplace__ListingAlreadyActive");
    });
  });

  describe("Cancelling and Updating Listings", function () {
    beforeEach(async function () {
      await marketplace.connect(seller).createListing(1, parsedPrice);
    });

    it("Should allow seller to cancel listing", async function () {
      const tx = await marketplace.connect(seller).cancelListing(1);

      await expect(tx)
        .to.emit(marketplace, "ListingCancelled")
        .withArgs(1, 1);

      await expect(
        marketplace.getListing(1)
      ).to.be.revertedWithCustomError(marketplace, "Marketplace__ListingNotActive");
    });

    it("Should revert if non-seller tries to cancel", async function () {
      await expect(
        marketplace.connect(stranger).cancelListing(1)
      ).to.be.revertedWithCustomError(marketplace, "Marketplace__NotSeller");
    });

    it("Should allow seller to update listing price", async function () {
      const newPrice = ethers.parseEther("2.5");
      const tx = await marketplace.connect(seller).updatePrice(1, newPrice);

      await expect(tx)
        .to.emit(marketplace, "PriceUpdated")
        .withArgs(1, 1, newPrice);

      const listing = await marketplace.getListing(1);
      expect(listing.price).to.equal(newPrice);
    });
  });

  describe("Buying and Completing Sale", function () {
    beforeEach(async function () {
      await marketplace.connect(seller).createListing(1, parsedPrice);

      // Approve Marketplace in LandNFT to lock/transfer NFT
      await landNFT.connect(seller).approve(await marketplace.getAddress(), 1);

      // Approve Marketplace in LandRegistry to update land ownership
      await landRegistry.connect(seller).approve(await marketplace.getAddress(), 1);
    });

    it("Should revert buyNFT if paid price does not match", async function () {
      await expect(
        marketplace.connect(buyer).buyNFT(1, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWithCustomError(marketplace, "Marketplace__IncorrectPayment");
    });

    it("Should successfully initiate purchase and lock NFT inside Marketplace", async function () {
      const tx = await marketplace.connect(buyer).buyNFT(1, { value: parsedPrice });

      await expect(tx)
        .to.emit(marketplace, "NFTPurchased")
        .withArgs(1, 1, buyer.address, 1);

      // NFT must now be locked inside the Marketplace contract
      expect(await landNFT.ownerOf(1)).to.equal(await marketplace.getAddress());

      const listing = await marketplace.getListing(1);
      expect(listing.escrowId).to.equal(1);
      expect(listing.pendingBuyer).to.equal(buyer.address);

      // Check that the Escrow contract holds the locked ETH
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(parsedPrice);

      // Escrow buyer must be Marketplace address holding the NFT
      const escrowDetails = await escrow.getEscrowDetails(1);
      expect(escrowDetails.buyer).to.equal(await marketplace.getAddress());
      expect(escrowDetails.seller).to.equal(seller.address);
    });

    it("Should revert completeSale if escrow is not yet verified", async function () {
      await marketplace.connect(buyer).buyNFT(1, { value: parsedPrice });

      await expect(
        marketplace.connect(buyer).completeSale(1)
      ).to.be.revertedWithCustomError(marketplace, "Marketplace__SaleNotReady");
    });

    it("Should successfully complete sale once verifier approves transfer in escrow", async function () {
      await marketplace.connect(buyer).buyNFT(1, { value: parsedPrice });

      // Verifier verifies transfer (NFT is in Marketplace so ownership check passes)
      await escrow.connect(verifier).verifyTransfer(1);

      // Release funds from escrow to seller
      await escrow.connect(seller).releaseFunds(1);

      // Complete sale
      const tx = await marketplace.connect(buyer).completeSale(1);

      await expect(tx)
        .to.emit(marketplace, "SaleCompleted")
        .withArgs(1, 1, buyer.address);

      // Real human buyer must now own the NFT
      expect(await landNFT.ownerOf(1)).to.equal(buyer.address);

      // LandRegistry ownership must be updated to buyer address
      const landDetails = await landRegistry.getLandDetails(1);
      expect(landDetails.owner).to.equal(buyer.address);

      // Listing must be deleted
      await expect(
        marketplace.getListing(1)
      ).to.be.revertedWithCustomError(marketplace, "Marketplace__ListingNotActive");
    });
  });

  describe("Pausability", function () {
    it("Should restrict listing when paused", async function () {
      await marketplace.connect(admin).pause();

      await expect(
        marketplace.connect(seller).createListing(1, parsedPrice)
      ).to.be.revertedWithCustomError(marketplace, "EnforcedPause");
    });
  });
});
