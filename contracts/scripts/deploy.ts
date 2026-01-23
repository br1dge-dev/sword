import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy SWORD Token
  console.log("\n1. Deploying SWORD Token...");
  const SWORD = await ethers.getContractFactory("SWORD");
  const sword = await SWORD.deploy(deployer.address);
  await sword.waitForDeployment();
  const swordAddress = await sword.getAddress();
  console.log("   SWORD Token deployed to:", swordAddress);

  // 2. Deploy SwordUpgradeController
  console.log("\n2. Deploying SwordUpgradeController...");
  const SwordUpgradeController = await ethers.getContractFactory("SwordUpgradeController");
  const controller = await SwordUpgradeController.deploy(swordAddress, deployer.address);
  await controller.waitForDeployment();
  const controllerAddress = await controller.getAddress();
  console.log("   SwordUpgradeController deployed to:", controllerAddress);

  // 3. Set Controller as Minter
  console.log("\n3. Setting Controller as SWORD minter...");
  const tx = await sword.setMinter(controllerAddress);
  await tx.wait();
  console.log("   Minter set successfully!");

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(50));
  console.log("\nContract Addresses:");
  console.log("  SWORD Token:            ", swordAddress);
  console.log("  SwordUpgradeController: ", controllerAddress);
  console.log("\nConfiguration:");
  console.log("  Price per upgrade:      0.001 ETH");
  console.log("  Tier 1 (0-999):         100 $SWORD per upgrade");
  console.log("  Tier 2 (1000-4999):     75 $SWORD per upgrade");
  console.log("  Tier 3 (5000-14999):    50 $SWORD per upgrade");
  console.log("  Tier 4 (15000+):        25 $SWORD per upgrade");
  console.log("\nNext steps:");
  console.log("  1. Verify contracts on BaseScan");
  console.log("  2. Update frontend with contract addresses");
  console.log("  3. Test upgrade functionality");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
