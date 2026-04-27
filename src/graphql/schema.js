const typeDefs = `
  type User {
    id: ID!
    name: String!
    lastName: String!
    email: String!
    phone: String
    cedula: String
    birthDate: String
    authProvider: String!
    status: String!
    createdAt: String!
  }

  type Vehicle {
    id: ID!
    brand: String!
    model: String!
    year: Int!
    price: Float!
    status: String!
    description: String
    images: [String!]!
    owner: User!
    createdAt: String!
  }

  type Pagination {
    page: Int!
    limit: Int!
    total: Int!
    pages: Int!
  }

  type PaginatedVehicles {
    data: [Vehicle!]!
    pagination: Pagination!
  }

  type Chat {
    id: ID!
    vehicle: Vehicle!
    interested: User!
    owner: User!
    lastMessage: Message
    createdAt: String!
  }

  type Message {
    id: ID!
    chat: ID!
    sender: User!
    text: String!
    messageType: String!
    isRead: Boolean!
    createdAt: String!
  }

  type PaginatedMessages {
    data: [Message!]!
    pagination: Pagination!
  }

  type Query {
    # Public
    vehicles(
      page: Int
      limit: Int
      brand: String
      model: String
      minYear: Int
      maxYear: Int
      minPrice: Float
      maxPrice: Float
      status: String
      sort: String
    ): PaginatedVehicles!

    vehicle(id: ID!): Vehicle

    # Protected
    me: User
    myVehicles(
      page: Int
      limit: Int
      brand: String
      model: String
      minYear: Int
      maxYear: Int
      minPrice: Float
      maxPrice: Float
      status: String
      sort: String
    ): PaginatedVehicles!
    myChatsAsInterested(page: Int, limit: Int): [Chat!]!
    myChatsAsOwner(page: Int, limit: Int): [Chat!]!
    chatMessages(chatId: ID!, page: Int, limit: Int): PaginatedMessages!
  }
`;

module.exports = { typeDefs };
