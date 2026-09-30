const crypto = require('crypto');
const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');

const getCategories = async (req, res, next) => {
  try {
    const rawCategories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    const categories = formatWithId(rawCategories);
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, icon, image } = req.body;
    const slug = (name || 'Category').toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const rawCategory = await prisma.category.create({
      data: {
        id: crypto.randomUUID(),
        name: name || 'New Category',
        slug: slug || `category-${Date.now()}`,
        icon: icon || 'Utensils',
        image: image || ''
      }
    });
    const category = formatWithId([rawCategory])[0];
    res.status(201).json({ success: true, category });
  } catch (err) {
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, icon, image, isActive } = req.body;

    const data = {};
    if (name) {
      data.name = name;
      data.slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    }
    if (icon) data.icon = icon;
    if (image !== undefined) data.image = image;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.category.update({
      where: { id },
      data
    });

    res.json({ success: true, category: formatWithId([updated])[0] });
  } catch (err) {
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id } });
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
