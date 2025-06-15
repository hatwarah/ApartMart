import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Package, 
  Upload, 
  X, 
  Save,
  ArrowLeft,
  DollarSign,
  Hash,
  Tag
} from 'lucide-react';
import { supabase, Product, Category } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category_id: string;
  inventory_count: number;
  sku: string;
  weight: number;
  dimensions: string;
  tags: string;
  is_active: boolean;
}

const ProductForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const isEditing = Boolean(id);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<ProductFormData>({
    defaultValues: {
      is_active: true,
      inventory_count: 0,
      price: 0,
      weight: 0
    }
  });

  useEffect(() => {
    fetchCategories();
    if (isEditing) {
      fetchProduct();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProduct = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(image_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Set form values
      Object.keys(data).forEach(key => {
        if (key === 'tags') {
          setValue('tags', data.tags?.join(', ') || '');
        } else if (key !== 'images') {
          setValue(key as keyof ProductFormData, data[key]);
        }
      });

      // Set images
      setImages(data.images?.map((img: any) => img.image_url) || []);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        return data.publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setImages([...images, ...uploadedUrls]);
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!profile) return;

    setLoading(true);
    try {
      const productData = {
        ...data,
        price: Number(data.price),
        inventory_count: Number(data.inventory_count),
        weight: data.weight ? Number(data.weight) : null,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : null,
        created_by: profile.id
      };

      let productId = id;

      if (isEditing) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) throw error;
        productId = newProduct.id;
      }

      // Handle images
      if (images.length > 0) {
        // Delete existing images if editing
        if (isEditing) {
          await supabase
            .from('product_images')
            .delete()
            .eq('product_id', productId);
        }

        // Insert new images
        const imageData = images.map((url, index) => ({
          product_id: productId,
          image_url: url,
          is_primary: index === 0,
          sort_order: index
        }));

        const { error: imageError } = await supabase
          .from('product_images')
          .insert(imageData);

        if (imageError) throw imageError;
      }

      navigate('/team/products');
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/team/products')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                {isEditing ? 'Edit Product' : 'Add New Product'}
              </h1>
              <p className="text-gray-600">
                {isEditing ? 'Update product information' : 'Create a new product for your catalog'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-emerald-100">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <Package className="w-6 h-6 mr-3 text-emerald-600" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  {...register('name', { required: 'Product name is required' })}
                  type="text"
                  className="w-full px-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter product name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter product description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    {...register('price', { 
                      required: 'Price is required',
                      min: { value: 0, message: 'Price must be positive' }
                    })}
                    type="number"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0.00"
                  />
                </div>
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  {...register('category_id')}
                  className="w-full px-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    {...register('sku')}
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Product SKU"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inventory Count *
                </label>
                <input
                  {...register('inventory_count', { 
                    required: 'Inventory count is required',
                    min: { value: 0, message: 'Inventory count must be positive' }
                  })}
                  type="number"
                  className="w-full px-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
                {errors.inventory_count && (
                  <p className="mt-1 text-sm text-red-600">{errors.inventory_count.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-emerald-100">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Additional Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (kg)
                </label>
                <input
                  {...register('weight')}
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dimensions
                </label>
                <input
                  {...register('dimensions')}
                  type="text"
                  className="w-full px-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="L x W x H"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma separated)
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    {...register('tags')}
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="electronics, gadgets, popular"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center space-x-3">
                  <input
                    {...register('is_active')}
                    type="checkbox"
                    className="w-5 h-5 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Product is active and visible to customers
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-emerald-100">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Product Images</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Images
                </label>
                <div className="border-2 border-dashed border-emerald-300 rounded-2xl p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center space-y-2"
                  >
                    <Upload className="w-8 h-8 text-emerald-600" />
                    <span className="text-sm text-gray-600">
                      {uploading ? 'Uploading...' : 'Click to upload images'}
                    </span>
                  </label>
                </div>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Product ${index + 1}`}
                        className="w-full h-32 object-cover rounded-2xl"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-2 left-2 px-2 py-1 bg-emerald-500 text-white text-xs rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/team/products')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-3 rounded-2xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>{isEditing ? 'Update Product' : 'Create Product'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;