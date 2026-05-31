import { expect } from "chai";
import { network } from "hardhat";

describe("LandRegistry", function () {
  let landRegistry;
  let admin;
  let authority;
  let owner;
  let buyer;
  let operator;
  let stranger;
  let ethers;
  let AUTHORITY_ROLE;
  let DEFAULT_ADMIN_ROLE;

  const surveyNumber = "SRV-12345";
  const plotNumber = "Plot-9B";
  const landAddress = "123 LandVerse Way, Cyber City";
  const area = 5000;
  const titleDeedURI = "ipfs://QmTDeed";
  const ownershipProofURI = "ipfs://QmProof";
  const geoLocationURI = "ipfs://QmGeo";

  beforeEach(async function () {
    const conn = await network.create();
    ethers = conn.ethers;

    [admin, authority, owner, buyer, operator, stranger] = await ethers.getSigners();

    const LandRegistryFactory = await ethers.getContractFactory("LandRegistry");
    landRegistry = await LandRegistryFactory.deploy(admin.address);

    DEFAULT_ADMIN_ROLE = await landRegistry.DEFAULT_ADMIN_ROLE();
    AUTHORITY_ROLE = await landRegistry.AUTHORITY_ROLE();

    // Grant authority role to authority account
    await landRegistry.connect(admin).grantRole(AUTHORITY_ROLE, authority.address);
  });

  // Helper to register a land as `owner`
  async function registerDefaultLand() {
    return landRegistry.connect(owner).registerLand(
      surveyNumber,
      plotNumber,
      landAddress,
      area,
      titleDeedURI,
      ownershipProofURI,
      geoLocationURI
    );
  }

  describe("Deployment", function () {
    it("Should set the admin and authority roles correctly", async function () {
      expect(await landRegistry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await landRegistry.hasRole(AUTHORITY_ROLE, admin.address)).to.be.true;
      expect(await landRegistry.hasRole(AUTHORITY_ROLE, authority.address)).to.be.true;
      expect(await landRegistry.hasRole(AUTHORITY_ROLE, owner.address)).to.be.false;
    });
  });

  describe("Land Registration", function () {
    it("Should allow a user to register land with correct details", async function () {
      const tx = await registerDefaultLand();

      await expect(tx)
        .to.emit(landRegistry, "LandRegistered")
        .withArgs(1, owner.address, surveyNumber, plotNumber, area);

      const details = await landRegistry.getLandDetails(1);
      expect(details.landId).to.equal(1);
      expect(details.surveyNumber).to.equal(surveyNumber);
      expect(details.plotNumber).to.equal(plotNumber);
      expect(details.landAddress).to.equal(landAddress);
      expect(details.area).to.equal(area);
      expect(details.titleDeedURI).to.equal(titleDeedURI);
      expect(details.ownershipProofURI).to.equal(ownershipProofURI);
      expect(details.geoLocationURI).to.equal(geoLocationURI);
      expect(details.owner).to.equal(owner.address);
      expect(details.verified).to.be.false;
      expect(details.exists).to.be.true;
    });

    it("Should add the registered landId to the user's lands list", async function () {
      await registerDefaultLand();
      const userLands = await landRegistry.getUserLands(owner.address);
      expect(userLands.length).to.equal(1);
      expect(userLands[0]).to.equal(1);
    });

    it("Should revert if survey number is duplicate", async function () {
      await registerDefaultLand();

      await expect(
        landRegistry.connect(buyer).registerLand(
          surveyNumber, "Plot-10B", landAddress, 2000,
          titleDeedURI, ownershipProofURI, geoLocationURI
        )
      ).to.be.revertedWithCustomError(landRegistry, "LandRegistry__DuplicateSurveyNumber")
        .withArgs(surveyNumber);
    });

    it("Should revert if surveyNumber is empty", async function () {
      await expect(
        landRegistry.connect(owner).registerLand(
          "", plotNumber, landAddress, area,
          titleDeedURI, ownershipProofURI, geoLocationURI
        )
      ).to.be.revertedWithCustomError(landRegistry, "LandRegistry__InvalidParameter")
        .withArgs("surveyNumber");
    });

    it("Should revert if area is zero", async function () {
      await expect(
        landRegistry.connect(owner).registerLand(
          surveyNumber, plotNumber, landAddress, 0,
          titleDeedURI, ownershipProofURI, geoLocationURI
        )
      ).to.be.revertedWithCustomError(landRegistry, "LandRegistry__InvalidArea");
    });
  });

  describe("Land Verification", function () {
    beforeEach(async function () {
      await registerDefaultLand();
    });

    it("Should allow authority to verify land", async function () {
      const tx = await landRegistry.connect(authority).verifyLand(1);

      await expect(tx)
        .to.emit(landRegistry, "LandVerified")
        .withArgs(1, authority.address);

      const details = await landRegistry.getLandDetails(1);
      expect(details.verified).to.be.true;
    });

    it("Should revert if non-authority tries to verify land", async function () {
      await expect(
        landRegistry.connect(owner).verifyLand(1)
      ).to.be.revertedWithCustomError(landRegistry, "AccessControlUnauthorizedAccount")
        .withArgs(owner.address, AUTHORITY_ROLE);
    });

    it("Should revert if verifying already verified land", async function () {
      await landRegistry.connect(authority).verifyLand(1);

      await expect(
        landRegistry.connect(authority).verifyLand(1)
      ).to.be.revertedWithCustomError(landRegistry, "LandRegistry__LandAlreadyVerified")
        .withArgs(1);
    });
  });

  describe("Land Rejection", function () {
    beforeEach(async function () {
      await registerDefaultLand();
    });

    it("Should allow authority to reject land and release survey number", async function () {
      const tx = await landRegistry.connect(authority).rejectLand(1, "Fraudulent document");

      await expect(tx)
        .to.emit(landRegistry, "LandRejected")
        .withArgs(1, authority.address, "Fraudulent document");

      await expect(
        landRegistry.getLandDetails(1)
      ).to.be.revertedWithCustomError(landRegistry, "LandRegistry__LandDoesNotExist")
        .withArgs(1);

      // Survey number should now be free for re-registration
      const tx2 = await landRegistry.connect(buyer).registerLand(
        surveyNumber, plotNumber, landAddress, area,
        titleDeedURI, ownershipProofURI, geoLocationURI
      );
      await expect(tx2).to.emit(landRegistry, "LandRegistered").withArgs(2, buyer.address, surveyNumber, plotNumber, area);
    });

    it("Should remove rejected land from owner's lands list", async function () {
      expect((await landRegistry.getUserLands(owner.address)).length).to.equal(1);
      await landRegistry.connect(authority).rejectLand(1, "Incorrect area");
      expect((await landRegistry.getUserLands(owner.address)).length).to.equal(0);
    });

    it("Should revert if non-authority tries to reject", async function () {
      await expect(
        landRegistry.connect(owner).rejectLand(1, "Invalid")
      ).to.be.revertedWithCustomError(landRegistry, "AccessControlUnauthorizedAccount")
        .withArgs(owner.address, AUTHORITY_ROLE);
    });

    it("Should revert when rejecting already verified land", async function () {
      await landRegistry.connect(authority).verifyLand(1);
      await expect(
        landRegistry.connect(authority).rejectLand(1, "Changed mind")
      ).to.be.revertedWithCustomError(landRegistry, "LandRegistry__LandAlreadyVerified")
        .withArgs(1);
    });
  });

  describe("Ownership Transfer", function () {
    beforeEach(async function () {
      await registerDefaultLand();
    });

    it("Should revert if land is not verified", async function () {
      await expect(
        landRegistry.connect(owner).transferOwnership(1, buyer.address)
      ).to.be.revertedWithCustomError(landRegistry, "LandRegistry__LandNotVerified")
        .withArgs(1);
    });

    it("Should allow owner to transfer verified land", async function () {
      await landRegistry.connect(authority).verifyLand(1);

      const tx = await landRegistry.connect(owner).transferOwnership(1, buyer.address);

      await expect(tx)
        .to.emit(landRegistry, "OwnershipTransferred")
        .withArgs(1, owner.address, buyer.address);

      const details = await landRegistry.getLandDetails(1);
      expect(details.owner).to.equal(buyer.address);

      expect((await landRegistry.getUserLands(owner.address)).length).to.equal(0);
      expect((await landRegistry.getUserLands(buyer.address)).length).to.equal(1);
      expect((await landRegistry.getUserLands(buyer.address))[0]).to.equal(1);
    });

    it("Should allow approved spender to transfer verified land", async function () {
      await landRegistry.connect(authority).verifyLand(1);
      await landRegistry.connect(owner).approve(operator.address, 1);

      const tx = await landRegistry.connect(operator).transferOwnership(1, buyer.address);

      await expect(tx)
        .to.emit(landRegistry, "OwnershipTransferred")
        .withArgs(1, owner.address, buyer.address);

      // Approval is cleared after transfer
      expect(await landRegistry.getApproved(1)).to.equal(ethers.ZeroAddress);
    });

    it("Should allow approvedForAll operator to transfer verified land", async function () {
      await landRegistry.connect(authority).verifyLand(1);
      await landRegistry.connect(owner).setApprovalForAll(operator.address, true);

      const tx = await landRegistry.connect(operator).transferOwnership(1, buyer.address);

      await expect(tx)
        .to.emit(landRegistry, "OwnershipTransferred")
        .withArgs(1, owner.address, buyer.address);
    });

    it("Should revert if stranger tries to transfer", async function () {
      await landRegistry.connect(authority).verifyLand(1);

      await expect(
        landRegistry.connect(stranger).transferOwnership(1, buyer.address)
      ).to.be.revertedWithCustomError(landRegistry, "LandRegistry__NotOwnerOrApproved")
        .withArgs(1);
    });

    it("Should revert on transfer to zero address", async function () {
      await landRegistry.connect(authority).verifyLand(1);

      await expect(
        landRegistry.connect(owner).transferOwnership(1, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(landRegistry, "LandRegistry__TransferToZeroAddress");
    });
  });

  describe("Geolocation Updates", function () {
    beforeEach(async function () {
      await registerDefaultLand();
      await landRegistry.connect(authority).verifyLand(1);
    });

    it("Should allow owner to update geolocation and reset verification", async function () {
      const newGeo = "ipfs://QmNewGeoLocation";
      const tx = await landRegistry.connect(owner).updateGeoLocation(1, newGeo);

      await expect(tx)
        .to.emit(landRegistry, "GeoLocationUpdated")
        .withArgs(1, newGeo);

      const details = await landRegistry.getLandDetails(1);
      expect(details.geoLocationURI).to.equal(newGeo);
      expect(details.verified).to.be.false; // Must be re-verified by authority
    });

    it("Should revert if non-owner tries to update geolocation", async function () {
      await expect(
        landRegistry.connect(stranger).updateGeoLocation(1, "ipfs://QmNewGeoLocation")
      ).to.be.revertedWithCustomError(landRegistry, "LandRegistry__NotOwnerOrApproved")
        .withArgs(1);
    });
  });

  describe("Pausable", function () {
    it("Should allow admin to pause and unpause", async function () {
      expect(await landRegistry.paused()).to.be.false;

      await landRegistry.connect(admin).pause();
      expect(await landRegistry.paused()).to.be.true;

      await expect(registerDefaultLand())
        .to.be.revertedWithCustomError(landRegistry, "EnforcedPause");

      await landRegistry.connect(admin).unpause();
      expect(await landRegistry.paused()).to.be.false;
    });

    it("Should revert if non-admin tries to pause", async function () {
      await expect(
        landRegistry.connect(stranger).pause()
      ).to.be.revertedWithCustomError(landRegistry, "AccessControlUnauthorizedAccount")
        .withArgs(stranger.address, DEFAULT_ADMIN_ROLE);
    });
  });
});
