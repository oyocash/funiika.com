// const dataFuniikaUrl = "http://localhost:8000"
const dataFuniikaUrl = "https://data.funiika.com"

const url = new URL(window.location.href)
const params = new URLSearchParams(url.search);
var skipParam = 0
if (params.get('skip')) {
  skipParam = params.get('skip')
}
const hashParam = params.get('hash')
const addressParam = params.get('address')

const MAX_record_LENGTH = 512;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function app() {
  return {
    openNav: false,
    user: {},
    username: '',
    password: '',
    pk: '',
    loginWithPK: false,
    recordText: '',
    selectedRecord: {},
    tipAmount: 100,
    message: '',
    search: '',
    records: [],
    evalRecords: [],
    commentHashes: [],
    evals: {},
    hashes: [],
    newFilter: '',
    filters: [],
    newOracle: '',
    oracles: [],

    refreshUserData() {
      return new Promise(function(resolve, reject) {
          setTimeout(resolve, 200);
      }).then(response => {
          this.user = userData
          this.username = ""
          this.password = ""
          this.pk = ""
          this.openNav = false
          this.getUserEvals()
      });          
    },

    getRecord() {
      fetch(hashesURL, {
        method: 'post',
        body: JSON.stringify( {hashes: [hashParam]} )  
      })
      .then(response => {
         if (!response.ok) {
             throw new Error("HTTP error " + response.status);
         }
         return response.json();
      })
      .then(json => {
        let record = json[0]
        let str = new Option(record.string).innerHTML
        str = str.replace(/(?:\r\n|\r|\n)/g, '<br>');

        var hasBeenTrue = false
        var hasBeenFalse = false
        if (this.evals[record.hash] === "1") {
          hasBeenTrue = true
        }
        if (this.evals[record.hash] === "0") {
          hasBeenFalse = true
        }
        this.selectedRecord = {
          name: record.address,
          address: record.address,
          hash: record.hash,
          record: str,
          trues: record.trues,
          falses: record.falses,
          date: new Date(record.timestamp),
          hasBeenFalse: hasBeenFalse,
          hasBeenTrue: hasBeenTrue
        };
      })
      .catch(function () {
         this.dataError = true;
      })
    },

    getCommentHashes() {
      return new Promise(function(resolve, reject) {
        this.hashes = []
        this.commentHashes = []

        var params = {}
        if (addressParam) {
          params.addresses = [addressParam]
        } else {
          params.directions = [hashParam]
        }
        params.relations = ["1"]

        fetch(linksURL, {
          method: 'post',
          body: JSON.stringify( params )  
        })
        .then(response => {
           if (!response.ok) {
               throw new Error("HTTP error " + response.status);
           }
           return response.json();
        })
        .then(json => {
          for (let i = json.length - 1; i >= 0; i--) {
            this.commentHashes.unshift(json[i].point)
          }
          resolve(this.commentHashes)
        })
      });
    },

    getComments() {
      this.getCommentHashes().then(r => {
        this.commentHashes = r
        if (this.commentHashes.length === 0)
          return

        let searchQuery = {}
        searchQuery.hashes = this.commentHashes

        console.log(searchQuery.hashes)

        fetch(hashesURL, {
          method: 'post',
          body: JSON.stringify( searchQuery )  
        })
        .then(response => {
          if (!response.ok) {
            throw new Error("HTTP error " + response.status);
          }
          return response.json();
        })
        .then(json => {
          console.log(json)
          this.populateRecords(json)
        })
        .catch(function () {
           this.dataError = true;
        })

      })
      .catch(function () {
         this.dataError = true;
      })
    },

    getRecords() {
      this.hashes = []
      var params = {}
      if (addressParam) {
        params = {
          addresses: [addressParam]
        }
      }
      if (this.search) {
        var searchString = '\"' + this.search + '\"';
        params.search = searchString
      } else {
        if (!addressParam ) {
          var searchString = this.filters.join(' ');
          params.search = searchString
        }
      }

      fetch(hashesURL, {
        method: 'post',
        body: JSON.stringify( params )  
      })
      .then(response => {
        if (!response.ok) {
          throw new Error("HTTP error " + response.status);
        }
        return response.json();
      })
      .then(json => {
        this.populateRecords(json)
      })
      .catch(function () {
         this.dataError = true;
      })
    },

    populateRecords(json) {
      this.records = []

      for (let i = json.length - 1; i >= 0; i--) {
        let record = json[i]
        let str = new Option(record.string).innerHTML
        str = str.replace(/(?:\r\n|\r|\n)/g, '<br>');

        let trues = 0
        let falses = 0
        if (this.oracles.length === 0) {
          trues = record.trues
          falses = record.falses
        }
        var hasBeenTrue = false
        var hasBeenFalse = false

        this.records.unshift({
          name: record.address,
          address: record.address,
          hash: record.hash,
          record: str,
          trues: trues,
          falses: falses,
          date: new Date(record.timestamp),
          hasBeenFalse: hasBeenFalse,
          hasBeenTrue: hasBeenTrue
        });
        this.hashes.push(record.hash)
      }
      if (this.oracles.length > 0) {
        this.populateEvals()
      }
    },

    getEvals (oracles = null) {
      var hashes = this.hashes
      if (!oracles) {
        oracles = this.oracles
      }
      return new Promise(function(resolve, reject) {
        var params = {};
        if (hashes && hashes.length > 0) {
          params.hashes = hashes
        }
        if (oracles && oracles.length > 0) {
          params.addresses = oracles
        }

        fetch(evalsURL, {
          method: 'post',
          body: JSON.stringify( params )  
        })
        .then(response => {
          if (!response.ok) {
            throw new Error("HTTP error " + response.status);
          }
          resolve (response.json())
          return response.json();
        })
        .catch(function () {
           this.dataError = true;
        })
      })
    },

    getUserEvals() {
      this.getEvalsLocalStorage()
      if (this.evals.length > 0) {
        if (JSON.stringify(this.selectedRecord) !== "{}") {
          if (this.evals[this.selectedRecord.hash] === "1") {
            this.selectedRecord.hasBeenTrue = true
          }
          if (this.evals[this.selectedRecord.hash] === "0") {
            this.selectedRecord.hasBeenFalse = true
          }
        }

        for (let i = this.records.length - 1; i >= 0; i--) {
          if (userEvals[this.records[i].hash] === "1") {
            this.records[i].hasBeenTrue = true
          }
          if (userEvals[this.records[i].hash] === "0") {
            this.records[i].hasBeenFalse = true
          }
        }
        return
      }

      this.getEvals([this.user.address])
      .then(json => {
        for (let i = json.length - 1; i >= 0; i--) {
          this.evals[json[i].hash] = json[i].value
          this.setEvalLocalStorage(json[i].hash, json[i].value)
        }

        if (JSON.stringify(this.selectedRecord) !== "{}") {
          if (this.evals[this.selectedRecord.hash] === "1") {
            this.selectedRecord.hasBeenTrue = true
          }
          if (this.evals[this.selectedRecord.hash] === "0") {
            this.selectedRecord.hasBeenFalse = true
          }
        }

        for (let i = this.records.length - 1; i >= 0; i--) {
          if (this.evals[this.records[i].hash] === "1") {
            this.records[i].hasBeenTrue = true
          }
          if (this.evals[this.records[i].hash] === "0") {
            this.records[i].hasBeenFalse = true
          }
        }
      })
    },

    getEvalRecords() {
      this.getEvals([addressParam])
      .then(json => {
        var evalHashes = []
        var profileEvals = {}
        for (let i = json.length - 1; i >= 0; i--) {
          evalHashes.push(json[i].hash)
          profileEvals[json[i].hash] = json[i].value

          if (evalHashes.length === 0)
            return

          let searchQuery = {}
          searchQuery.hashes = evalHashes

          fetch(hashesURL, {
            method: 'post',
            body: JSON.stringify( searchQuery )
          })
          .then(response => {
            if (!response.ok) {
              throw new Error("HTTP error " + response.status);
            }
            return response.json();
          })
          .then(json => {
            this.evalRecords = []

            for (let i = json.length - 1; i >= 0; i--) {
              let record = json[i]
              let str = new Option(record.string).innerHTML
              str = str.replace(/(?:\r\n|\r|\n)/g, '<br>');

              let trues = 0
              let falses = 0
              if (this.oracles.length === 0) {
                trues = record.trues
                falses = record.falses
              }

              var hasBeenTrue = false
              var hasBeenFalse = false
              if (profileEvals[json[i].hash] === "1") {
                hasBeenTrue = true
              }
              if (profileEvals[json[i].hash] === "0") {
                hasBeenFalse = true
              }

              this.evalRecords.unshift({
                name: record.address,
                address: record.address,
                hash: record.hash,
                record: str,
                trues: trues,
                falses: falses,
                date: new Date(record.timestamp),
                hasBeenFalse: hasBeenFalse,
                hasBeenTrue: hasBeenTrue
              });
            }
          })
          .catch(function () {
             this.dataError = true;
          })
        }
      })
    },

    populateEvals() {
      this.getEvals()
      .then(json => {
        for (let i = this.records.length - 1; i >= 0; i--) {
          this.records[i].trues = 0
          this.records[i].falses = 0
        }

        for (let i = json.length - 1; i >= 0; i--) {
          let record = json[i]
          let obj = this.records.find((o, ii) => {
            if (o.hash === record.hash) {
                let newObj = o
                if (record.value === "1") {
                  newObj.trues++
                }
                if (record.value === "0") {
                  newObj.falses++
                }

                this.records[ii] = newObj;
                return true; // stop searching
            }
          });
        }
      })
      .catch(function () {
         this.dataError = true;
      })
    },

    saveEval(hex, value) {
      let dataToPush = ["eval", "0x" + hex, value]
      requestUTXO().then ((data) => {
        buildForge(data, dataToPush, null, null, "Evaluated successfully")
      })

    },

    saveHash(hex, string) {
      let dataToPush = ["hash", "0x" + hex, string]
      requestUTXO().then ((data) => {
        buildForge(data, dataToPush, null, null, "Record added")
      })
    },

    saveLink(point, direction, relation) {
      let dataToPush = ["link", "0x" + point, "0x" + direction, relation]
      requestUTXO().then ((data) => {
        buildForge(data, dataToPush, null, null, "Comment added")
      })
    },

    sendTip(index = null) {
      let address

      if (index === null) {
        // for hash.html
        address = this.selectedRecord.address
      } else {
        // for lists
        address = this.records[index].address
      }

      requestUTXO().then ( (data) => {
        let amount = this.tipAmount * 100
        buildForge(data, null, address, amount, "Tip sent")
      })
    },

    checkComment() {
      stringToHash = this.recordText
      hash(stringToHash).then((hex) => {
        return hex
      })
      .then ((hex) => {
        checkHash(hex)
        .then(json => {
          if (json.length === 0) {
            this.saveHash(hex, stringToHash)

            this.records.unshift({
              name: this.user.address,
              address: this.user.address,
              hash: hex,
              record: stringToHash,
              trues: 0,
              falses: 0,
              date: new Date(),
              hasBeenFalse: false,
              hasBeenTrue: false
            });
          }

          return new Promise(function(resolve, reject) {
            setTimeout(resolve, 1000);
          }).then(response => {
            checkLink(hex, hashParam, "1")
            .then(json => {
              if (json.length === 0) {
                this.saveLink(hex, hashParam, "1")
              } else {
                this.message = "Comment already exists."
              }
            })
            .catch(function () {
               this.dataError = true;
            })
          })
        })
        .catch(function () {
           this.dataError = true;
        })
      });
      this.recordText = '';
    },

    checkRecord() {
      stringToHash = this.recordText
      hash(stringToHash).then((hex) => {
        return hex
      })
      .then ((hex) => {
        checkHash(hex)
        .then(json => {
          if (json.length === 0) {
            this.saveHash(hex, stringToHash)

            this.records.unshift({
              name: this.user.address,
              address: this.user.address,
              hash: hex,
              record: stringToHash,
              trues: 0,
              falses: 0,
              date: new Date(),
              hasBeenFalse: false,
              hasBeenTrue: false
            });
          } else {
            this.message = "Truth already exists."
          }
        })
        .catch(function () {
           this.dataError = true;
        })
      });
      this.recordText = '';
    },

    trueRecord(index = null) {
      if (!this.user.pk) {
        return
      }

      if (index === null) {
        this.saveEval(this.selectedRecord.hash, "1")
        this.setEvalLocalStorage(this.selectedRecord.hash, "1")
        this.selectedRecord.hasBeenTrue ? this.selectedRecord.trues-- : this.selectedRecord.trues++;
        this.selectedRecord.hasBeenTrue = !this.selectedRecord.hasBeenTrue;
        if (this.selectedRecord.hasBeenFalse === true) {
          this.selectedRecord.falses--
          this.selectedRecord.hasBeenFalse = false
        }
      } else {
        this.saveEval(this.records[index].hash, "1")
        this.setEvalLocalStorage(this.records[index].hash, "1")
        this.records[index].hasBeenTrue ? this.records[index].trues-- : this.records[index].trues++;
        this.records[index].hasBeenTrue = !this.records[index].hasBeenTrue;
        if (this.records[index].hasBeenFalse === true) {
          this.records[index].falses--
          this.records[index].hasBeenFalse = false
        }
      }
    },

    falseRecord(index = null) {
      if (!this.user.pk) {
        return
      }

      if (index === null) {
        this.saveEval(this.selectedRecord.hash, "0")
        this.setEvalLocalStorage(this.selectedRecord.hash, "0")
        this.selectedRecord.hasBeenFalse ? this.selectedRecord.falses-- : this.selectedRecord.falses++;
        this.selectedRecord.hasBeenFalse = !this.selectedRecord.hasBeenFalse;
        if (this.selectedRecord.hasBeenTrue === true) {
          this.selectedRecord.trues--
          this.selectedRecord.hasBeenTrue = false
        }
      } else {
        this.saveEval(this.records[index].hash, "0")
        this.setEvalLocalStorage(this.records[index].hash, "0")
        this.records[index].hasBeenFalse ? this.records[index].falses-- : this.records[index].falses++;
        this.records[index].hasBeenFalse = !this.records[index].hasBeenFalse;
        if (this.records[index].hasBeenTrue === true) {
          this.records[index].trues--
          this.records[index].hasBeenTrue = false
        }
      }
    },

    charactersRemaining() {
      return MAX_record_LENGTH - this.recordText.length;
    },

    recordIsOutOfRange() {
      return (MAX_record_LENGTH - this.recordText.length) == MAX_record_LENGTH || (MAX_record_LENGTH - this.recordText.length) < 0;
    },

    generateAvatarFromName(name) {
      return name.slice(1, 4);
    },

    formatDate(date) {
      if (!date) {
          return null;
      }
      
      const DAY_IN_MS = 86400000; // 24 * 60 * 60 * 1000
      const today = new Date();
      const yesterday = new Date(today - DAY_IN_MS);
      const d = new Date(date);
      const day = d.getDate();
        const month = MONTH_NAMES[d.getMonth()];

      const seconds = Math.round((today - d) / 1000);
        const minutes = Math.round(seconds / 60);
      const hours = Math.round(minutes / 60);

      const isToday = today.toDateString() === d.toDateString();
      // const isYesterday = yesterday.toDateString() === date.toDateString();
      // const isThisYear = today.getFullYear() === date.getFullYear();
      
      if (isToday) {
        if (seconds < 5) {
          return 'now';
        } else if (seconds < 60) {
          return `${ seconds }s`;
        } else if (minutes < 60) {
          return `${ minutes }m`;
        } else {
          return `${ hours }h`;
        }
      } else {
        return month +' '+ day;
      }
    },

    setPostOnchain() {
      if (this.user.postOnchain === null || this.user.postOnchain === false) {
        delete this.user.postOnchain
        localStorage.removeItem("user.postOnchain")
      } else {
        localStorage.setItem("user.postOnchain", this.user.postOnchain)
      }
    },

    getEvalsLocalStorage() {
      this.evals = JSON.parse(localStorage.getItem("evals") || "{}");
    },
    setEvalLocalStorage(hash, value) {
      this.evals[hash] = value
      localStorage.setItem("evals", JSON.stringify(this.evals))
    },

    getFilters() {
      this.filters = JSON.parse(localStorage.getItem("filters") || "[]");
    },
    setFilter() {
      if (this.filters.indexOf(this.newFilter) === -1) {
        this.filters.push(this.newFilter);
        localStorage.setItem("filters", JSON.stringify(this.filters))
      }
      this.newFilter = ""
      this.getRecords()
    },
    removeFilter(index) {
      this.filters.splice(index, 1);
      localStorage.setItem("filters", JSON.stringify(this.filters))
      this.getRecords()
    },

    getOracles() {
      this.oracles = JSON.parse(localStorage.getItem("oracles") || "[]");
    },
    setOracle() {
      if (this.oracles.indexOf(this.newOracle) === -1) {
        this.oracles.push(this.newOracle);
        localStorage.setItem("oracles", JSON.stringify(this.oracles))
      }
      this.newOracle = ""
      this.getRecords()
    },
    removeOracle(index) {
      this.oracles.splice(index, 1);
      localStorage.setItem("oracles", JSON.stringify(this.oracles))
      this.getRecords()
    }
  }
}

const hashesURL = dataFuniikaUrl + "/hashes"
const evalsURL = dataFuniikaUrl + "/evals"
const linksURL = dataFuniikaUrl + "/links"
const sendTxURL = dataFuniikaUrl + "/pushTx"

let stringToHash, dataToPush
let userData = {}

function checkHash(hash) {
  return new Promise(function(resolve, reject) {
    fetch(hashesURL, {
      method: 'post',
      body: JSON.stringify( {hashes: [hash]} )  
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }
      return response.json();
    })
    .then(json => {
      resolve(json)
    })
    .catch(function () {
    })
  });
}

function checkLink(point, direction, relation) {
  return new Promise(function(resolve, reject) {
    let searchQuery = {
      points: [point],
      directions: [direction],
      relations: [relation]
    }  
    fetch(linksURL, {
      method: 'post',
      body: JSON.stringify( searchQuery )  
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }
      return response.json();
    })
    .then(json => {
      resolve(json)
    })
    .catch(function () {
    })
  });
}

// tx send
async function requestUTXO() {
  // mattercloud.net utxo  (not working)
  // let utxoUrl = 'https://api.mattercloud.net/api/v3/main/address/' + address.toString() + '/utxo';
  // let response = await fetch(utxoUrl)
  // return await response.json()
  let utxoUrl = 'https://api.whatsonchain.com/v1/bsv/main/address/' + userData.address + '/unspent';
  let response = await fetch(utxoUrl)
  let data = await response.json()

  // wallet is empty
  if (data === undefined || data.length == 0) {
    return {}
  }

  let unspentTX = data[0]
  let txUrl = `https://api.whatsonchain.com/v1/bsv/main/tx/hash/${unspentTX.tx_hash}`;
  let response2 = await fetch(txUrl)
  let data2 = await response2.json()
  const utxo = {
    txid: unspentTX.tx_hash,
    vout: unspentTX.tx_pos,
    satoshis: unspentTX.value,
    script: data2.vout[unspentTX.tx_pos].scriptPubKey.hex,
    address: userData.address
  }
  return utxo
}

async function buildForge(utxo, txdata = null, address = null, amount = null, message) {
  var outputs = []

  if (txdata) {
    outputs.push({data: txdata})
  }
  if (address && amount) {
    outputs.push({to: address, satoshis: amount})
  }

  var forgeObj = {
    outputs: outputs,
    changeTo: utxo.address
  }
  if (userData['postOnchain']) {
    forgeObj['inputs'] = [utxo]
  }

  const forge = new TxForge.Forge(forgeObj)

  forge.build();

  let bsvTx = new bsvjs.Tx().fromObject(forge.tx);
  var keyPair = userData['keyPair']
  forge.sign({keyPair});
  let rawTx = forge.tx.toHex()

  if (!userData['postOnchain']) {
    const univrseKey = Univrse.util.fromBsvPrivKey(keyPair.privKey)
    const univrsePub = Univrse.util.fromBsvPubKey(keyPair.pubKey)

    // Sign using a single key
    const envelope = Univrse.Envelope.wrap(rawTx)
    await envelope.sign(univrseKey, { alg: 'ES256K-BSM', kid: keyPair.pubKey.toString() })
    var envString = envelope.toString()

    sendTxOffchainFetch(envString, message)
  } else {
    sendTxOnchainFetch(rawTx, message)
  }
}

const sendTxOffchainFetch = (envelope, successMessage) => {
  var params = {}
  params = {
    envelope: envelope
  }
  console.log(JSON.stringify(params))

  fetch(sendTxURL, {
    method: 'post',
    body: JSON.stringify( params )
  }).then(response => { 
    if (response.status === 200) {
      document.querySelector('[x-data]').__x.$data.message = successMessage
    } else {
      document.querySelector('[x-data]').__x.$data.message = "An error occurred. Please try again"
    }
  })
  .catch(function () {
     this.dataError = true;
  })
}

const sendTxOnchainFetch = (rawTx, successMessage) => {
  fetch('https://merchantapi.taal.com/mapi/tx', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({"rawtx": rawTx, "callBackUrl": "https://funiika.com/"})
  }).then(response => { 
    if (response.status === 200) {
      document.querySelector('[x-data]').__x.$data.message = successMessage
    } else {
      document.querySelector('[x-data]').__x.$data.message = "An error occurred. Please try again"
    }
  });
}

function hash(string) {
  const utf8 = new TextEncoder().encode(string);
  return crypto.subtle.digest('SHA-256', utf8).then((hashBuffer) => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((bytes) => bytes.toString(16).padStart(2, '0'))
      .join('');
    return hashHex;
  });
}
// END tx send

// loader
async function fetchHtmlAsText(url) {
    return await (await fetch(url)).text();
}
async function loadHeader() {
    const contentDiv = document.getElementById("header");
    if (contentDiv !== null) {
      contentDiv.innerHTML = await fetchHtmlAsText("/includes/header.html");
    }
}
async function loadRecords(title = "Records", divId = "records", recordsVar = "records") {
    const contentDiv = document.getElementById(divId);
    if (contentDiv !== null) {
      var fetchedText = await fetchHtmlAsText("/includes/records.html");
      fetchedText = fetchedText.replaceAll("%title%", title);
      fetchedText = fetchedText.replaceAll("records", recordsVar);
      contentDiv.innerHTML = fetchedText;
    }
}
async function loadSidebar() {
    const contentDiv = document.getElementById("sidebar");
    if (contentDiv !== null) {
      contentDiv.innerHTML = await fetchHtmlAsText("/includes/sidebar.html");
    }
}
async function loadFooter() {
    const contentDiv = document.getElementById("footer");
    if (contentDiv !== null) {
      contentDiv.innerHTML = await fetchHtmlAsText("/includes/footer.html");
    }
}
// END loader

// login
function getUserData() {
  let address = localStorage.getItem("user.address")
  let pk = localStorage.getItem("user.pk")
  let postOnchain = localStorage.getItem("user.postOnchain")
  if (pk) {
    const privKey = new bsvjs.PrivKey().fromString(pk)
    const keyPair = new bsvjs.KeyPair().fromPrivKey(privKey);
    userData = {address: address, pk: pk, keyPair: keyPair, postOnchain: postOnchain}
  }
}

function loginUP (username, password) {
  let hashedUsername, hashedPassword 
  if (username && password) {
    hash(username).then((hex) => {
      hashedUsername = hex
      return hash(password)
    }).then((hex) => {
      hashedPassword = hex
      return hash(hashedUsername + hashedPassword)
    }).then((hex) => {
      const privKey = new bsvjs.PrivKey().fromHex("80" + hex)
      const keyPair = new bsvjs.KeyPair().fromPrivKey(privKey);
      const pubKey = keyPair.pubKey;
      const address = new bsvjs.Address().fromPubKey(pubKey)
      localStorage.setItem('user.address', address.toString())
      localStorage.setItem('user.pk', privKey.toWif().toString())
      userData = {address: address.toString(), pk: privKey.toWif().toString(), keyPair: keyPair}
    })
  }
}

function loginPK (pk) {
  let privKey
  if (/^#[0-9A-F]{32}$/i.test(pk)) {
    privKey = new bsvjs.PrivKey().fromHex("80" + pk)
  } else {
    privKey = new bsvjs.PrivKey().fromString(pk)
  }
  const keyPair = new bsvjs.KeyPair().fromPrivKey(privKey);
  const pubKey = keyPair.pubKey;
  const address = new bsvjs.Address().fromPubKey(pubKey)
  localStorage.setItem('user.address', address.toString())
  localStorage.setItem('user.pk', privKey.toWif().toString())
  userData = {address: address.toString(), pk: privKey.toWif().toString(), keyPair: keyPair}
}

function logout() {
  userData = {}
  localStorage.removeItem('user.address')
  localStorage.removeItem('user.pk')
}
// END login
