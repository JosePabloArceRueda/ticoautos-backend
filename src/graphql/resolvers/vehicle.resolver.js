const Vehicle = require('../../models/Vehicle');
const { GraphQLError } = require('graphql');

const ALLOWED_SORT_FIELDS = ['price', 'year', 'createdAt'];

function buildVehicleFilter({ brand, model, minYear, maxYear, minPrice, maxPrice, status } = {}) {
  const filter = {};
  if (brand) filter.brand = { $regex: brand, $options: 'i' };
  if (model) filter.model = { $regex: model, $options: 'i' };
  if (minYear || maxYear) {
    filter.year = {};
    if (minYear) filter.year.$gte = minYear;
    if (maxYear) filter.year.$lte = maxYear;
  }
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = minPrice;
    if (maxPrice) filter.price.$lte = maxPrice;
  }
  if (status) filter.status = status;
  return filter;
}

function buildSortObj(sort = 'createdAt:desc') {
  const [field, order] = sort.split(':');
  const sortObj = {};
  if (ALLOWED_SORT_FIELDS.includes(field)) {
    sortObj[field] = order === 'desc' ? -1 : 1;
  } else {
    sortObj.createdAt = -1;
  }
  return sortObj;
}

const vehicleResolver = {
  Query: {
    async vehicles(_, args) {
      const { page = 1, limit = 12, sort, ...filters } = args;
      const filter = buildVehicleFilter(filters);
      const sortObj = buildSortObj(sort);
      const skip = (page - 1) * limit;

      const [total, data] = await Promise.all([
        Vehicle.countDocuments(filter),
        Vehicle.find(filter).populate('owner').sort(sortObj).skip(skip).limit(limit).lean(),
      ]);

      return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    },

    async vehicle(_, { id }) {
      const vehicle = await Vehicle.findById(id).populate('owner').lean();
      if (!vehicle) throw new GraphQLError('Vehículo no encontrado', { extensions: { code: 'NOT_FOUND' } });
      return vehicle;
    },

    async myVehicles(_, args, { user }) {
      if (!user) throw new GraphQLError('No autorizado', { extensions: { code: 'UNAUTHENTICATED' } });

      const { page = 1, limit = 12, sort, ...filters } = args;
      const filter = { ...buildVehicleFilter(filters), owner: user.id };
      const sortObj = buildSortObj(sort);
      const skip = (page - 1) * limit;

      const [total, data] = await Promise.all([
        Vehicle.countDocuments(filter),
        Vehicle.find(filter).populate('owner').sort(sortObj).skip(skip).limit(limit).lean(),
      ]);

      return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    },
  },
};

module.exports = { vehicleResolver };
