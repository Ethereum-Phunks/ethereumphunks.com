const moment = require('moment');
const fs = require('fs');
const path = require('path');

const timestamp = moment().format('MMMD').toLowerCase();
const angularJsonPath = path.join(__dirname, 'angular.json');

let angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));

// Update the outputPath for each configuration
['sepolia', 'mainnet'].forEach(config => {
  const basePath = `etherphunks-market-${config}_${timestamp}`;
  angularJson.projects['etherphunks-market'].architect.build.configurations[config].outputPath.base = `dist/${basePath}`;

  console.log(`Output dir: ${basePath}`);
});

fs.writeFileSync(angularJsonPath, JSON.stringify(angularJson, null, 2));
