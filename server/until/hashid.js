const Hashids = require("hashids");

// salt 越长越安全，不同业务可以用不同 salt
const hashids = new Hashids("your-salt-here", 10); // 最少 10 位

module.exports = {
  encode: (id) => hashids.encode(id),
  decode: (hash) => {
    const ids = hashids.decode(hash);
    return ids.length > 0 ? ids[0] : null;
  },
};
