require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.28",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        // Réseau local pour les tests
        localhost: {
            url: "http://127.0.0.1:8545"
        },
        // Réseau de test Sepolia (Ethereum testnet)
        sepolia: {
            url: `https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID`,
            accounts: [
                // Remplacez par votre clé privée de test (JAMAIS votre vraie clé privée!)
                // "0x" + "votre_cle_privee_de_test"
            ]
        }
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    },
    mocha: {
        timeout: 40000
    }
};