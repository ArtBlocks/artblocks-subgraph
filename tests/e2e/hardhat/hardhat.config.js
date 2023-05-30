require("@nomiclabs/hardhat-ethers");
const fs = require("fs");

/**
 * This overrides the default hardhat task to write the 
 * mnemonic to a file on a shardd volume so that it can 
 * be used by the test runner.
 */
task('node', 'Starts a Hardhat node', async (args, hre, runSuper) => {
  const accounts = config.networks.hardhat.accounts;
  fs.writeFileSync("./shared/accounts.json", JSON.stringify({mnemonic: accounts.mnemonic}));

  await runSuper(args)
});

module.exports = {
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 1000
      }
    }
  }
};
