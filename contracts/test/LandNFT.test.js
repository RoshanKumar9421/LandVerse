import { expect } from "chai";
import { network } from "hardhat";

describe("LandNFT", function () {
  let landRegistry;
  let landNFT;
  let admin;
  let authority;
  let landOwner;
  let buyer;
  let stranger;
  let ethers;
  let DEFAULT_ADMIN_ROLE;
  let MINTER_ROLE;
  let AUTHORITY_ROLE;

  const surveyNumber = "SRV-99999";
  const plotNumber = "Plot-15A";
  const landAddress = "456 Blockchain Blvd, Ether City";
  const area = 7500;
  const titleDeedURI = "ipfs://QmTDeedNFT";
  const ownershipProofURI = "ipfs://QmProofNFT";
  const geoLocationURI = "ipfs://QmGeoNFT";
  const metadataURI = "ipfs://QmNFTMetadata";

  beforeEach(async function () {
    const conn = await network.create();
    ethers = conn.ethers;

    [admin, authority, landOwner, buyer, stranger] = await ethers.getSigners();

    // 1. Deploy LandRegistry
    const LandRegistryFactory = await ethers.getContractFactory("LandRegistry");
    landRegistry = await LandRegistryFactory.deploy(admin.address);

    DEFAULT_ADMIN_ROLE = await landRegistry.DEFAULT_ADMIN_ROLE();
    AUTHORITY_ROLE = await landRegistry.AUTHORITY_ROLE();

    // Grant AUTHORITY_ROLE to authority
    await landRegistry.connect(admin).grantRole(AUTHORITY_ROLE, authority.address);

    // 2. Deploy LandNFT referencing LandRegistry
    const LandNFTFactory = await ethers.getContractFactory("LandNFT");
    landNFT = await LandNFTFactory.deploy(await landRegistry.getAddress(), admin.address);

    MINTER_ROLE = await landNFT.MINTER_ROLE();
  });

  // Helper to register and verify a land in LandRegistry
  async function registerAndVerifyLand() {
    await landRegistry.connect(landOwner).registerLand(
      surveyNumber,
      plotNumber,
      landAddress,
      area,
      titleDeedURI,
      ownershipProofURI,
      geoLocationURI
    );
    await landRegistry.connect(authority).verifyLand(1);
  }

  describe("Deployment", function () {
    it("Should correctly set LandRegistry address and admin roles", async function () {
      expect(await landNFT.landRegistry()).to.equal(await landRegistry.getAddress());
      expect(await landNFT.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await landNFT.hasRole(MINTER_ROLE, admin.address)).to.be.true;
    });
  });

  describe("Minting NFTs", function () {
    it("Should revert if land does not exist", async function () {
      await expect(
        landNFT.connect(admin).mintLandNFT(99, landOwner.address, metadataURI)
      ).to.be.revertedWithCustomError(landRegistry, "LandRegistry__LandDoesNotExist")
        .withArgs(99);
    });

    it("Should revert if land is not verified", async function () {
      // Register but do NOT verify
      await landRegistry.connect(landOwner).registerLand(
        surveyNumber,
        plotNumber,
        landAddress,
        area,
        titleDeedURI,
        ownershipProofURI,
        geoLocationURI
      );

      await expect(
        landNFT.connect(admin).mintLandNFT(1, landOwner.address, metadataURI)
      ).to.be.revertedWithCustomError(landNFT, "LandNFT__LandNotVerified")
        .withArgs(1);
    });

    it("Should allow MINTER_ROLE to mint NFT for a verified land", async function () {
      await registerAndVerifyLand();

      const tx = await landNFT.connect(admin).mintLandNFT(1, landOwner.address, metadataURI);

      await expect(tx)
        .to.emit(landNFT, "NFTMinted")
        .withArgs(1, 1, landOwner.address, metadataURI, await ethers.provider.getBlock("latest").then(b => b.timestamp));

      expect(await landNFT.ownerOf(1)).to.equal(landOwner.address);
      expect(await landNFT.tokenURI(1)).to.equal(metadataURI);
      expect(await landNFT.getLandToken(1)).to.equal(1);

      const nftInfo = await landNFT.getNFTInfo(1);
      expect(nftInfo.tokenId).to.equal(1);
      expect(nftInfo.landId).to.equal(1);
      expect(nftInfo.metadataURI).to.equal(metadataURI);
      expect(nftInfo.currentOwner).to.equal(landOwner.address);
      expect(nftInfo.mintedTimestamp).to.be.gt(0);
    });

    it("Should revert if attempting to mint duplicate NFT for same landId", async function () {
      await registerAndVerifyLand();
      await landNFT.connect(admin).mintLandNFT(1, landOwner.address, metadataURI);

      await expect(
        landNFT.connect(admin).mintLandNFT(1, landOwner.address, "ipfs://someOther")
      ).to.be.revertedWithCustomError(landNFT, "LandNFT__NFTAlreadyMinted")
        .withArgs(1);
    });

    it("Should revert if non-minter attempts to mint", async function () {
      await registerAndVerifyLand();

      await expect(
        landNFT.connect(stranger).mintLandNFT(1, landOwner.address, metadataURI)
      ).to.be.revertedWithCustomError(landNFT, "AccessControlUnauthorizedAccount")
        .withArgs(stranger.address, MINTER_ROLE);
    });
  });

  describe("Transferring NFTs", function () {
    beforeEach(async function () {
      await registerAndVerifyLand();
      await landNFT.connect(admin).mintLandNFT(1, landOwner.address, metadataURI);
    });

    it("Should allow the owner of the NFT to transfer it", async function () {
      const tx = await landNFT.connect(landOwner).transferLandNFT(1, buyer.address);

      await expect(tx)
        .to.emit(landNFT, "NFTTransferred")
        .withArgs(1, landOwner.address, buyer.address);

      expect(await landNFT.ownerOf(1)).to.equal(buyer.address);

      // Verify the NFTInfo currentOwner field was updated automatically in the _update override
      const nftInfo = await landNFT.getNFTInfo(1);
      expect(nftInfo.currentOwner).to.equal(buyer.address);
    });

    it("Should revert if non-owner or non-approved tries to transfer", async function () {
      await expect(
        landNFT.connect(stranger).transferLandNFT(1, buyer.address)
      ).to.be.revertedWithCustomError(landNFT, "LandNFT__NotTokenOwnerOrApproved")
        .withArgs(1);
    });
  });

  describe("Burning NFTs", function () {
    beforeEach(async function () {
      await registerAndVerifyLand();
      await landNFT.connect(admin).mintLandNFT(1, landOwner.address, metadataURI);
    });

    it("Should allow admin to burn NFT and clear mappings", async function () {
      const tx = await landNFT.connect(admin).burnNFT(1);

      await expect(tx)
        .to.emit(landNFT, "NFTBurned")
        .withArgs(1, 1);

      // Bidirectional mappings must be cleared
      expect(await landNFT.getLandToken(1)).to.equal(0);

      await expect(
        landNFT.ownerOf(1)
      ).to.be.revertedWithCustomError(landNFT, "ERC721NonexistentToken")
        .withArgs(1);

      await expect(
        landNFT.getNFTInfo(1)
      ).to.be.revertedWithCustomError(landNFT, "LandNFT__TokenDoesNotExist")
        .withArgs(1);
    });

    it("Should revert if non-admin tries to burn NFT", async function () {
      await expect(
        landNFT.connect(stranger).burnNFT(1)
      ).to.be.revertedWithCustomError(landNFT, "AccessControlUnauthorizedAccount")
        .withArgs(stranger.address, DEFAULT_ADMIN_ROLE);
    });
  });

  describe("Pausability", function () {
    beforeEach(async function () {
      await registerAndVerifyLand();
    });

    it("Should restrict minting, transferring, and burning when paused", async function () {
      await landNFT.connect(admin).pause();

      await expect(
        landNFT.connect(admin).mintLandNFT(1, landOwner.address, metadataURI)
      ).to.be.revertedWithCustomError(landNFT, "EnforcedPause");

      await landNFT.connect(admin).unpause();
      await landNFT.connect(admin).mintLandNFT(1, landOwner.address, metadataURI);

      await landNFT.connect(admin).pause();

      await expect(
        landNFT.connect(landOwner).transferLandNFT(1, buyer.address)
      ).to.be.revertedWithCustomError(landNFT, "EnforcedPause");

      await expect(
        landNFT.connect(admin).burnNFT(1)
      ).to.be.revertedWithCustomError(landNFT, "EnforcedPause");
    });
  });
});
