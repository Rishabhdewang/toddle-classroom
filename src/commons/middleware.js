const jwt = require("jsonwebtoken");
const ACCESS_SECRET_KEY = "toddle";

function authenticate(req, res, next) {
  if (!req.headers.authorization && !req.query.token) {
    return res.sendStatus(401);
  }
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.status(401);
  jwt.verify(token, ACCESS_SECRET_KEY, (error, user) => {
    if (error) {
      console.log({ error });
      return res.status(401).send(error);
    }
    req.user = user;
    next();
  });
}

function authorize(roles = []) {
  if (typeof roles === 'string') {
      roles = [roles];
  }

  return [
      (req, res, next) => {
          if (roles.length && !roles.includes(req.user.type)) {
              return res.status(401).json({ message: 'Unauthorized' });
          }
          next();
      }
  ];
}

module.exports = { authenticate, authorize };
