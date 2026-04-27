const User = require('../../models/User');
const { GraphQLError } = require('graphql');

const userResolver = {
  Query: {
    async me(_, __, { user }) {
      if (!user) throw new GraphQLError('No autorizado', { extensions: { code: 'UNAUTHENTICATED' } });
      const found = await User.findById(user.id).lean();
      if (!found) throw new GraphQLError('Usuario no encontrado', { extensions: { code: 'NOT_FOUND' } });
      return found;
    },
  },
};

module.exports = { userResolver };
