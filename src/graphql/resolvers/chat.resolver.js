const Question = require('../../models/Question');
const Answer = require('../../models/Answer');
const { GraphQLError } = require('graphql');

const chatResolver = {
  Query: {
    async myChatsAsInterested(_, { page = 1, limit = 12 }, { user }) {
      if (!user) throw new GraphQLError('No autorizado', { extensions: { code: 'UNAUTHENTICATED' } });

      const skip = (page - 1) * limit;
      const chats = await Question.find({ interested: user.id })
        .populate('vehicle')
        .populate('interested')
        .populate('owner')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return Promise.all(
        chats.map(async (chat) => {
          const lastMessage = await Answer.findOne({ chat: chat._id })
            .populate('sender')
            .sort({ createdAt: -1 })
            .lean();
          return { ...chat, lastMessage };
        })
      );
    },

    async myChatsAsOwner(_, { page = 1, limit = 12 }, { user }) {
      if (!user) throw new GraphQLError('No autorizado', { extensions: { code: 'UNAUTHENTICATED' } });

      const skip = (page - 1) * limit;
      const chats = await Question.find({ owner: user.id })
        .populate('vehicle')
        .populate('interested')
        .populate('owner')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return Promise.all(
        chats.map(async (chat) => {
          const lastMessage = await Answer.findOne({ chat: chat._id })
            .populate('sender')
            .sort({ createdAt: -1 })
            .lean();
          return { ...chat, lastMessage };
        })
      );
    },

    async chatMessages(_, { chatId, page = 1, limit = 50 }, { user }) {
      if (!user) throw new GraphQLError('No autorizado', { extensions: { code: 'UNAUTHENTICATED' } });

      const chat = await Question.findById(chatId).lean();
      if (!chat) throw new GraphQLError('Chat no encontrado', { extensions: { code: 'NOT_FOUND' } });

      const isParticipant =
        chat.interested.toString() === user.id || chat.owner.toString() === user.id;
      if (!isParticipant) throw new GraphQLError('No autorizado', { extensions: { code: 'FORBIDDEN' } });

      const skip = (page - 1) * limit;
      const [total, data] = await Promise.all([
        Answer.countDocuments({ chat: chatId }),
        Answer.find({ chat: chatId })
          .populate('sender')
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
      ]);

      return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    },
  },
};

module.exports = { chatResolver };
