# clear existing ABIs
rm -f ./*.json
# import ABIs from artblocks npm dependency
while IFS="" read -r contractName || [ -n "$contractName" ]
do
  # copy ABI json file from @artblocks npm dependency to the current directory
  find '../node_modules/@artblocks/contracts/artifacts/contracts' -regex .*/$contractName.json | xargs -I {} cp {} .
done < _include-artblocks-abis.txt
# import additional abis from supplemental ABIs directory
cp ../abis-supplemental/*.json .
# import required openzeppelin ABIs
cp ../node_modules/@openzeppelin-4.7/contracts/build/contracts/Ownable.json .
cp ../node_modules/@openzeppelin-4.8/contracts-upgradeable/build/contracts/OwnableUpgradeable.json .
