const jwt = require("jsonwebtoken");

const isAuthorized = (subscriber, result) => {
  if(result === undefined) throw new Error("Nothing to Authorize")
  return (
    subscriber === undefined || //internal or a test (hasn't gone through gateway)
    subscriber === null ||
    result.authorized_readers.length === 0 || //everyone can read
    result.authorized_readers.includes(subscriber)
  ); //current sub is in the list
};

const getSub = (authHeader) => {
  if (authHeader === null || authHeader === undefined) {
    return null;
  }

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7, authHeader.length);

    const dToken = jwt.decode(token);

    return dToken["sub"];
  } else {
    console.log("Missing Bearer Token");
    return null;
  }
};

module.exports = {
  getSub,
  isAuthorized,
};
