const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('./categoryController');
const { protect, authorize } = require('../../middlewares/authMiddleware');

router.get('/', getCategories);
router.post('/', protect, authorize('ADMIN', 'admin', 'VENDOR', 'vendor'), createCategory);
router.put('/:id', protect, authorize('ADMIN', 'admin'), updateCategory);
router.delete('/:id', protect, authorize('ADMIN', 'admin'), deleteCategory);

module.exports = router;
