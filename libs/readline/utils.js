const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, (question) => {
      resolve(question);
    });
  });
}

function close() {
  rl.close();
}

module.exports = {
  question,
  close,
};
