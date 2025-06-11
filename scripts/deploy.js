const { ethers } = require("hardhat");

async function main() {
  const CertificatPropriete = await ethers.getContractFactory("CertificatPropriete");
  const contrat = await CertificatPropriete.deploy();
  await contrat.waitForDeployment();
  console.log(`Contrat déployé à l'adresse : ${contrat.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
