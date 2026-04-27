const { vehicleResolver } = require('./vehicle.resolver');
const { userResolver } = require('./user.resolver');
const { chatResolver } = require('./chat.resolver');

const resolvers = {
  Query: {
    ...vehicleResolver.Query,
    ...userResolver.Query,
    ...chatResolver.Query,
  },

  // Map Mongoose _id to id for all types
  User: { id: (parent) => parent._id?.toString() ?? parent.id },
  Vehicle: { id: (parent) => parent._id?.toString() ?? parent.id },
  Chat: { id: (parent) => parent._id?.toString() ?? parent.id },
  Message: {
    id: (parent) => parent._id?.toString() ?? parent.id,
    chat: (parent) => parent.chat?.toString(),
  },
};

module.exports = { resolvers };
