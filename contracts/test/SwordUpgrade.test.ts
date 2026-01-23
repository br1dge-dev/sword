import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("GR1FTSWORD Contracts", function () {
  
  async function deployContractsFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy SWORD Token
    const SWORD = await ethers.getContractFactory("SWORD");
    const sword = await SWORD.deploy(owner.address);

    // Deploy Controller
    const Controller = await ethers.getContractFactory("SwordUpgradeController");
    const controller = await Controller.deploy(await sword.getAddress(), owner.address);

    // Set minter
    await sword.setMinter(await controller.getAddress());

    return { sword, controller, owner, user1, user2, user3 };
  }

  describe("SWORD Token", function () {
    it("Should have correct name and symbol", async function () {
      const { sword } = await loadFixture(deployContractsFixture);
      expect(await sword.name()).to.equal("SWORD");
      expect(await sword.symbol()).to.equal("SWORD");
    });

    it("Should only allow minter to mint", async function () {
      const { sword, user1 } = await loadFixture(deployContractsFixture);
      await expect(
        sword.connect(user1).mint(user1.address, 1000n)
      ).to.be.revertedWith("SWORD: Only minter can mint");
    });
  });

  describe("SwordUpgradeController", function () {
    
    describe("Deployment", function () {
      it("Should set correct constants", async function () {
        const { controller } = await loadFixture(deployContractsFixture);
        expect(await controller.PRICE_PER_UPGRADE()).to.equal(ethers.parseEther("0.001"));
        expect(await controller.TIER_1_THRESHOLD()).to.equal(1000n);
        expect(await controller.TIER_2_THRESHOLD()).to.equal(5000n);
        expect(await controller.TIER_3_THRESHOLD()).to.equal(15000n);
      });

      it("Should start with zero upgrades", async function () {
        const { controller } = await loadFixture(deployContractsFixture);
        expect(await controller.totalUpgrades()).to.equal(0n);
        const [forge, charge, glitch] = await controller.getGlobalState();
        expect(forge).to.equal(0n);
        expect(charge).to.equal(0n);
        expect(glitch).to.equal(0n);
      });
    });

    describe("Bonding Curve", function () {
      it("Should return 100 $SWORD in Tier 1", async function () {
        const { controller } = await loadFixture(deployContractsFixture);
        expect(await controller.getRewardAmount()).to.equal(ethers.parseEther("100"));
        expect(await controller.getCurrentTier()).to.equal(1n);
      });
    });

    describe("Upgrade Function", function () {
      it("Should perform single FORGE upgrade", async function () {
        const { controller, sword, user1 } = await loadFixture(deployContractsFixture);

        await expect(
          controller.connect(user1).upgrade(0, 1, { value: ethers.parseEther("0.001") })
        ).to.emit(controller, "Upgraded");

        expect(await controller.totalUpgrades()).to.equal(1n);
        expect(await sword.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
      });

      it("Should batch 5 CHARGE upgrades", async function () {
        const { controller, sword, user1 } = await loadFixture(deployContractsFixture);

        await controller.connect(user1).upgrade(1, 5, { value: ethers.parseEther("0.005") });

        expect(await controller.totalUpgrades()).to.equal(5n);
        const [_, charge, __] = await controller.getGlobalState();
        expect(charge).to.equal(5n);
        expect(await sword.balanceOf(user1.address)).to.equal(ethers.parseEther("500"));
      });

      it("Should reject wrong ETH amount", async function () {
        const { controller, user1 } = await loadFixture(deployContractsFixture);

        await expect(
          controller.connect(user1).upgrade(0, 1, { value: ethers.parseEther("0.0005") })
        ).to.be.revertedWith("SwordUpgrade: incorrect ETH amount");
      });

      it("Should reject zero amount", async function () {
        const { controller, user1 } = await loadFixture(deployContractsFixture);

        await expect(
          controller.connect(user1).upgrade(0, 0)
        ).to.be.revertedWith("SwordUpgrade: amount must be > 0");
      });

      it("Should track different upgrade types separately", async function () {
        const { controller, user1, user2 } = await loadFixture(deployContractsFixture);

        await controller.connect(user1).upgrade(0, 3, { value: ethers.parseEther("0.003") }); // FORGE
        await controller.connect(user2).upgrade(1, 2, { value: ethers.parseEther("0.002") }); // CHARGE
        await controller.connect(user1).upgrade(2, 4, { value: ethers.parseEther("0.004") }); // GLITCH

        const [forge, charge, glitch] = await controller.getGlobalState();
        expect(forge).to.equal(3n);
        expect(charge).to.equal(2n);
        expect(glitch).to.equal(4n);
        expect(await controller.totalUpgrades()).to.equal(9n);
      });

      it("Should track user contributions correctly", async function () {
        const { controller, user1, user2 } = await loadFixture(deployContractsFixture);

        await controller.connect(user1).upgrade(0, 5, { value: ethers.parseEther("0.005") });
        await controller.connect(user2).upgrade(0, 3, { value: ethers.parseEther("0.003") });

        const [forge1, _, __] = await controller.getUserContributions(user1.address);
        const [forge2, ___, ____] = await controller.getUserContributions(user2.address);
        
        expect(forge1).to.equal(5n);
        expect(forge2).to.equal(3n);
      });
    });

    describe("Withdrawal", function () {
      it("Should allow owner to withdraw", async function () {
        const { controller, owner, user1 } = await loadFixture(deployContractsFixture);

        // User upgrades
        await controller.connect(user1).upgrade(0, 10, { value: ethers.parseEther("0.01") });

        const contractBalance = await ethers.provider.getBalance(await controller.getAddress());
        expect(contractBalance).to.equal(ethers.parseEther("0.01"));

        // Owner withdraws
        await expect(controller.connect(owner).withdraw())
          .to.emit(controller, "Withdraw");

        const newBalance = await ethers.provider.getBalance(await controller.getAddress());
        expect(newBalance).to.equal(0n);
      });

      it("Should reject non-owner withdraw", async function () {
        const { controller, user1 } = await loadFixture(deployContractsFixture);

        await expect(
          controller.connect(user1).withdraw()
        ).to.be.revertedWithCustomError(controller, "OwnableUnauthorizedAccount");
      });
    });
  });
});
