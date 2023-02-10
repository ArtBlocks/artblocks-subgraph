require("@nomiclabs/hardhat-ethers");
const fs = require("fs");

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
