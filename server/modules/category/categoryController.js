const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');

const getCategories = async (req, res, next) => {
  try {
    const rawCategories = await prisma.category.findMany();
    const categories = formatWithId(rawCategories);
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, icon, image } = req.body;
    const slug = name.toLowerCase().replace(/ /g, '-');
    const rawCategory = await prisma.category.create({
      data: { name, slug, icon: icon || 'Utensils', image: image || '' }
    });
    const category = formatWithId(rawCategory);
    res.status(201).json({ success: true, category });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCategories, createCategory };
