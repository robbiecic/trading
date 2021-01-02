var IG = require("./node-ig-api");

//havePositions
async function havePositions() {
  return new Promise((resolve, reject) => {
    //IG get open positions
    IG.login(false)
      .then(() => {
        IG.showOpenPositions()
          .then(positions => {
            //console.log(Object.values(positions));
            let returnValue = positions.positions;
            //console.log(returnValue);
            if (returnValue.length === 0) {
              reject("NO POSITIONS OPENED");
            } else {
              resolve(returnValue);
            }
          })
          .catch(error => {
            reject("ERROR RETURNING POSITIONS - " + error);
          });
      })
      .catch(e => {
        reject("ERROR CONNECTING TO IG - " + e);
      });
  });
}

module.exports.havePositions = havePositions;
