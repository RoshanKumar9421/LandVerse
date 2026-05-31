import { expect } from "chai";
import { network } from "hardhat";

describe("Escrow", function () {
  let landRegistry;
  let landNFT;
  let escrow;
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
  let parsedAmount;

  const surveyNumber = "SRV-88888";
  const plotNumber = "Plot-22C";
  const landAddress = "789 Decentralized Rd, Cryptotown";
  const area = 10000;
  const titleDeedURI = "ipfs://QmDeedEscrow";
  const ownershipProofURI = "ipfs://QmProofEscrow";
  const geoLocationURI = "ipfs://QmGeoEscrow";
  const metadataURI = "ipfs://QmEscrowNFTMetadata";
  const dealAmount = "1.5"; // 1.5 ETH

  beforeEach(async function () {
    const conn = await network.create();
    ethers = conn.ethers;

    [admin, verifier, seller, buyer, stranger] = await ethers.getSigners();
    parsedAmount = ethers.parseEther(dealAmount);

    // 1. Deploy LandRegistry
    const LandRegistryFactory = await ethers.getContractFactory("LandRegistry");
    landRegistry = await LandRegistryFactory.deploy(admin.address);

    DEFAULT_ADMIN_ROLE = await landRegistry.DEFAULT_ADMIN_ROLE();
    AUTHORITY_ROLE = await landRegistry.AUTHORITY_ROLE();

    // Grant AUTHORITY_ROLE to admin to register and verify land easily
    await landRegistry.connect(admin).grantRole(AUTHORITY_ROLE, admin.address);

    // 2. Deploy LandNFT
    const LandNFTFactory = await ethers.getContractFactory("LandNFT");
    landNFT = await LandNFTFactory.deploy(await landRegistry.getAddress(), admin.address);

    MINTER_ROLE = await landNFT.MINTER_ROLE();
    await landNFT.connect(admin).grantRole(MINTER_ROLE, admin.address);

    // 3. Deploy Escrow referencing LandNFT
    const EscrowFactory = await ethers.getContractFactory("Escrow");
    escrow = await EscrowFactory.deploy(await landNFT.getAddress(), admin.address);

    VERIFIER_ROLE = await escrow.VERIFIER_ROLE();

    // Grant VERIFIER_ROLE to verifier account
    await escrow.connect(admin).grantRole(VERIFIER_ROLE, verifier.address);

    // 4. Setup a verified Land NFT owned by seller
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
    it("Should set correct configurations and admin roles", async function () {
      expect(await escrow.landNFT()).to.equal(await landNFT.getAddress());
      expect(await escrow.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await escrow.hasRole(VERIFIER_ROLE, verifier.address)).to.be.true;
    });
  });

  describe("Creating Escrows", function () {
    it("Should revert on zero payment value", async function () {
      await expect(
        escrow.connect(buyer).createEscrow(1, seller.address, { value: 0 })
      ).to.be.revertedWithCustomError(escrow, "Escrow__InvalidAmount");
    });

    it("Should revert if seller address is invalid or buyer themselves", async function () {
      await expect(
        escrow.connect(buyer).createEscrow(1, ethers.ZeroAddress, { value: ethers.parseEther(dealAmount) })
      ).to.be.revertedWithCustomError(escrow, "Escrow__InvalidAddress");

      await expect(
        escrow.connect(buyer).createEscrow(1, buyer.address, { value: ethers.parseEther(dealAmount) })
      ).to.be.revertedWithCustomError(escrow, "Escrow__InvalidAddress");
    });

    it("Should revert if designated seller is not the current NFT owner", async function () {
      await expect(
        escrow.connect(buyer).createEscrow(1, stranger.address, { value: ethers.parseEther(dealAmount) })
      ).to.be.revertedWithCustomError(escrow, "Escrow__SellerNotNFTOwner")
        .withArgs(1, stranger.address);
    });

    it("Should successfully create escrow and lock ETH", async function () {
      const parsedAmount = ethers.parseEther(dealAmount);
      const tx = await escrow.connect(buyer).createEscrow(1, seller.address, { value: parsedAmount });

      await expect(tx)
        .to.emit(escrow, "EscrowCreated")
        .withArgs(1, 1, buyer.address, seller.address, parsedAmount);

      // Verify ETH balance locked inside contract
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(parsedAmount);

      const details = await escrow.getEscrowDetails(1);
      expect(details.escrowId).to.equal(1);
      expect(details.tokenId).to.equal(1);
      expect(details.buyer).to.equal(buyer.address);
      expect(details.seller).to.equal(seller.address);
      expect(details.amount).to.equal(parsedAmount);
      expect(details.verified).to.be.false;
      expect(details.completed).to.be.false;
      expect(details.refunded).to.be.false;
    });
  });

  describe("Verifying Ownership Transfers", function () {

    beforeEach(async function () {
      await escrow.connect(buyer).createEscrow(1, seller.address, { value: parsedAmount });
    });

    it("Should revert if non-verifier calls verifyTransfer", async function () {
      await expect(
        escrow.connect(stranger).verifyTransfer(1)
      ).to.be.revertedWithCustomError(escrow, "AccessControlUnauthorizedAccount")
        .withArgs(stranger.address, VERIFIER_ROLE);
    });

    it("Should revert verifyTransfer if NFT has not yet been transferred to buyer", async function () {
      await expect(
        escrow.connect(verifier).verifyTransfer(1)
      ).to.be.revertedWithCustomError(escrow, "Escrow__OwnershipTransferNotOccurred")
        .withArgs(1, buyer.address);
    });

    it("Should successfully verifyTransfer when NFT ownership resides with buyer", async function () {
      // Seller transfers land NFT to buyer
      await landNFT.connect(seller).transferLandNFT(1, buyer.address);

      const tx = await escrow.connect(verifier).verifyTransfer(1);

      await expect(tx)
        .to.emit(escrow, "TransferVerified")
        .withArgs(1, 1, verifier.address);

      const details = await escrow.getEscrowDetails(1);
      expect(details.verified).to.be.true;
    });
  });

  describe("Releasing Funds", function () {

    beforeEach(async function () {
      await escrow.connect(buyer).createEscrow(1, seller.address, { value: parsedAmount });
    });

    it("Should revert if transaction is not verified", async function () {
      await expect(
        escrow.connect(seller).releaseFunds(1)
      ).to.be.revertedWithCustomError(escrow, "Escrow__EscrowNotVerified")
        .withArgs(1);
    });

    it("Should successfully release locked ETH to seller when verified", async function () {
      // Seller transfers NFT to buyer and verifier approves transfer
      await landNFT.connect(seller).transferLandNFT(1, buyer.address);
      await escrow.connect(verifier).verifyTransfer(1);

      // Check seller balance before
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

      // Release funds
      const tx = await escrow.connect(stranger).releaseFunds(1);

      await expect(tx)
        .to.emit(escrow, "FundsReleased")
        .withArgs(1, seller.address, parsedAmount);

      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(parsedAmount);

      // Contract balance must be 0 now
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0);

      const details = await escrow.getEscrowDetails(1);
      expect(details.completed).to.be.true;
    });
  });

  describe("Refunding Buyers", function () {

    beforeEach(async function () {
      await escrow.connect(buyer).createEscrow(1, seller.address, { value: parsedAmount });
    });

    it("Should revert if non-verifier calls refundBuyer", async function () {
      await expect(
        escrow.connect(stranger).refundBuyer(1)
      ).to.be.revertedWithCustomError(escrow, "AccessControlUnauthorizedAccount")
        .withArgs(stranger.address, VERIFIER_ROLE);
    });

    it("Should successfully refund buyer and empty contract ETH balance", async function () {
      // Check buyer balance before
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

      const tx = await escrow.connect(verifier).refundBuyer(1);

      await expect(tx)
        .to.emit(escrow, "BuyerRefunded")
        .withArgs(1, buyer.address, parsedAmount);

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      // Since buyer is receiving funds back but didn't pay for this tx gas (verifier did), balance increase should be exact
      expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(parsedAmount);

      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0);

      const details = await escrow.getEscrowDetails(1);
      expect(details.refunded).to.be.true;
    });

    it("Should revert if attempting to release funds for a refunded transaction", async function () {
      await escrow.connect(verifier).refundBuyer(1);

      await expect(
        escrow.connect(seller).releaseFunds(1)
      ).to.be.revertedWithCustomError(escrow, "Escrow__EscrowAlreadyRefunded")
        .withArgs(1);
    });
  });

  describe("Pausability", function () {
    it("Should restrict actions when paused", async function () {
      await escrow.connect(admin).pause();

      await expect(
        escrow.connect(buyer).createEscrow(1, seller.address, { value: ethers.parseEther(dealAmount) })
      ).to.be.revertedWithCustomError(escrow, "EnforcedPause");
    });
  });
});
