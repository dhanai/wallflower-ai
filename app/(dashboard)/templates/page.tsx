'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ContextMenu } from '@base-ui-components/react/context-menu';
import { AlertDialog } from '@base-ui-components/react/alert-dialog';
import { useToast } from '@/hooks/useToast';

interface Design {
  id: string;
  title: string;
  image_url: string;
  thumbnail_image_url?: string;
  category?: string;
  tags?: string[];
  created_at: string;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
}

interface TemplatesByCollection {
  collection: Collection;
  designs: Design[];
}

export default function TemplatesPage() {
  const [templatesByCollection, setTemplatesByCollection] = useState<TemplatesByCollection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [contextMenuTemplateId, setContextMenuTemplateId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [collectionTags, setCollectionTags] = useState<string>('');
  const toast = useToast();

  // Flatten all designs for search/filtering
  const allDesigns = templatesByCollection.flatMap(item => 
    item.designs.map(design => ({ ...design, collectionName: item.collection.name }))
  );

  // Fetch user role
  useEffect(() => {
    async function fetchUserRole() {
      try {
        const response = await fetch('/api/auth/user-role');
        if (response.ok) {
          const { role } = await response.json();
          setUserRole(role || null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    }
    fetchUserRole();
  }, []);

  // Load collections if admin
  useEffect(() => {
    if (userRole === 'admin') {
      async function loadCollections() {
        try {
          const response = await fetch('/api/collections/list');
          if (response.ok) {
            const { collections: data } = await response.json();
            setCollections(data || []);
          }
        } catch (error) {
          console.error('Error loading collections:', error);
        }
      }
      loadCollections();
    }
  }, [userRole]);

  useEffect(() => {
    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Loading timeout reached, setting loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    async function loadTemplates() {
      try {
        console.log('Loading templates from collections via API...');
        
        const response = await fetch('/api/collections/templates');
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API error:', response.status, errorData);
          setTemplatesByCollection([]);
          return;
        }
        
        const { templatesByCollection: data, error } = await response.json();

        console.log('Templates by collection received:', data?.length || 0);
        
        if (error) {
          console.error('API returned error:', error);
          setTemplatesByCollection([]);
          setLoading(false);
          return;
        }
        
        setTemplatesByCollection(data || []);
        console.log('Templates loaded:', (data || []).length, 'collections');
      } catch (error) {
        console.error('Error loading templates:', error);
        setTemplatesByCollection([]);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }

    loadTemplates();
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Get unique categories (collection names)
  const categories = Array.from(new Set(templatesByCollection.map(item => item.collection.name)));

  // Filter templates based on search query and category
  const filteredCollections = templatesByCollection.map(item => {
    let filteredDesigns = item.designs;

    // Filter by selected category
    if (selectedCategory && item.collection.name !== selectedCategory) {
      filteredDesigns = [];
    }

    // Filter by search query (searches title, collection name, description, and tags)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredDesigns = filteredDesigns.filter(design => {
        const titleMatch = design.title?.toLowerCase().includes(query);
        const collectionMatch = item.collection.name?.toLowerCase().includes(query);
        const descriptionMatch = item.collection.description?.toLowerCase().includes(query);
        const tagsMatch = design.tags?.some(tag => tag.toLowerCase().includes(query));
        return titleMatch || collectionMatch || descriptionMatch || tagsMatch;
      });
    }

    return {
      ...item,
      designs: filteredDesigns,
    };
  }).filter(item => item.designs.length > 0); // Only show collections with matching designs

  const totalDesigns = filteredCollections.reduce((sum, item) => sum + item.designs.length, 0);

  const handleDeleteTemplate = async () => {
    if (!contextMenuTemplateId) return;

    try {
      const response = await fetch('/api/collections/remove-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: contextMenuTemplateId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete template');
      }

      // Remove from local state - need to find and remove from the nested structure
      setTemplatesByCollection(prev => prev.map(collection => ({
        ...collection,
        designs: collection.designs.filter(d => d.id !== contextMenuTemplateId),
      })).filter(collection => collection.designs.length > 0));

      toast.success('Template deleted successfully');
      setShowDeleteConfirm(false);
      setContextMenuTemplateId(null);
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(error.message || 'Failed to delete template');
    }
  };

  const handleAddToCollection = async () => {
    if (!contextMenuTemplateId || !selectedCollectionId) {
      toast.error('Please select a collection');
      return;
    }

    // For templates, we need to find the design_id from the template
    // First, find the template in our data
    const template = allDesigns.find(d => d.id === contextMenuTemplateId);
    if (!template) {
      toast.error('Template not found');
      return;
    }

    // Templates store their image URL, but we need the original design ID
    // Since templates are independent copies, we need to find if there's a matching design
    // For now, we'll use the template's image URL to find/create a design entry
    try {
      const tags = collectionTags
        ? collectionTags.split(',').map(t => t.trim()).filter(t => t)
        : [];

      // We'll need to create a design from the template first, then add it to collection
      // For simplicity, let's call the add-design API with the template ID
      // But actually, templates are in design_collections, so we need to handle this differently
      // Let me check - templates are templates, they can't be added to another collection as-is
      // Actually, we should copy the template to create a design, then add that design to a collection
      // For now, let's just show an error that this needs to be done from the editor
      toast.info('To add a template to a collection, open it in the editor and use "Save to Collection" from there.');
      setShowAddToCollection(false);
      setContextMenuTemplateId(null);
      setSelectedCollectionId('');
      setCollectionTags('');
    } catch (error: any) {
      console.error('Error adding to collection:', error);
      toast.error(error.message || 'Failed to add template to collection');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse mb-4" />
            <div className="h-5 w-64 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-gray-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4">
          <div>
            <h1 className="text-4xl md:text-4xl font-bold mb-2 tracking-tighter text-[#1d1d1f]">
              Templates
            </h1>
            <p className="text-gray-500 text-base md:text-lg">
              {templatesByCollection.length === 0 
                ? 'Browse pre-made design templates' 
                : `${totalDesigns} ${totalDesigns === 1 ? 'template' : 'templates'}${selectedCategory ? ` in ${selectedCategory}` : ''} across ${filteredCollections.length} ${filteredCollections.length === 1 ? 'collection' : 'collections'}`}
            </p>
          </div>
          
          {/* Category Filters */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === null
                    ? 'bg-[#7c3aed] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-[#7c3aed] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Search Bar */}
          {templatesByCollection.length > 0 && (
            <div className="relative flex-1 max-w-md">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 512 512" 
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="currentColor"
              >
                <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/>
              </svg>
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition-all text-[#1d1d1f] placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M374.6 320L573.3 121.3C581.1 113.5 581.1 101.2 573.3 93.4C565.5 85.6 553.2 85.6 545.4 93.4L346.7 292.6L147.4 93.4C139.6 85.6 127.3 85.6 119.5 93.4C111.7 101.2 111.7 113.5 119.5 121.3L318.2 320L119.5 518.7C111.7 526.5 111.7 538.8 119.5 546.6C123.4 550.5 128.6 552.5 133.8 552.5C139 552.5 144.2 550.5 148.1 546.6L346.7 348L545.4 546.7C549.3 550.6 554.5 552.6 559.7 552.6C564.9 552.6 570.1 550.6 574 546.7C581.8 538.9 581.8 526.6 574 518.8L374.6 320z"/>
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {templatesByCollection.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200 p-12 md:p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-b from-[#7c3aed] to-[#6d28d9] shadow-2xl shadow-[#7c3aed]/40 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-12 h-12 text-white" fill="currentColor">
                  <path d="M128 160C128 124.7 156.7 96 192 96L512 96C547.3 96 576 124.7 576 160L576 416C576 451.3 547.3 480 512 480L192 480C156.7 480 128 451.3 128 416L128 160zM56 192C69.3 192 80 202.7 80 216L80 512C80 520.8 87.2 528 96 528L456 528C469.3 528 480 538.7 480 552C480 565.3 469.3 576 456 576L96 576C60.7 576 32 547.3 32 512L32 216C32 202.7 42.7 192 56 192zM224 224C241.7 224 256 209.7 256 192C256 174.3 241.7 160 224 160C206.3 160 192 174.3 192 192C192 209.7 206.3 224 224 224zM420.5 235.5C416.1 228.4 408.4 224 400 224C391.6 224 383.9 228.4 379.5 235.5L323.2 327.6L298.7 297C294.1 291.3 287.3 288 280 288C272.7 288 265.8 291.3 261.3 297L197.3 377C191.5 384.2 190.4 394.1 194.4 402.4C198.4 410.7 206.8 416 216 416L488 416C496.7 416 504.7 411.3 508.9 403.7C513.1 396.1 513 386.9 508.4 379.4L420.4 235.4z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-2 tracking-tight text-[#1d1d1f]">
                No templates yet
              </h2>
              <p className="text-gray-500 mb-8">
                Templates will appear here once admins save designs to collections.
              </p>
            </div>
          </div>
        ) : (
          <>
            {filteredCollections.length === 0 ? (
              <div className="text-center py-16">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor">
                  <path d="M128 160C128 124.7 156.7 96 192 96L512 96C547.3 96 576 124.7 576 160L576 416C576 451.3 547.3 480 512 480L192 480C156.7 480 128 451.3 128 416L128 160zM56 192C69.3 192 80 202.7 80 216L80 512C80 520.8 87.2 528 96 528L456 528C469.3 528 480 538.7 480 552C480 565.3 469.3 576 456 576L96 576C60.7 576 32 547.3 32 512L32 216C32 202.7 42.7 192 56 192zM224 224C241.7 224 256 209.7 256 192C256 174.3 241.7 160 224 160C206.3 160 192 174.3 192 192C192 209.7 206.3 224 224 224zM420.5 235.5C416.1 228.4 408.4 224 400 224C391.6 224 383.9 228.4 379.5 235.5L323.2 327.6L298.7 297C294.1 291.3 287.3 288 280 288C272.7 288 265.8 291.3 261.3 297L197.3 377C191.5 384.2 190.4 394.1 194.4 402.4C198.4 410.7 206.8 416 216 416L488 416C496.7 416 504.7 411.3 508.9 403.7C513.1 396.1 513 386.9 508.4 379.4L420.4 235.4z"/>
                </svg>
                <p className="text-gray-500 mb-2">
                  {searchQuery ? `No templates found matching "${searchQuery}"` : `No templates in ${selectedCategory}`}
                </p>
                <p className="text-sm text-gray-400">0 results</p>
              </div>
            ) : (
              <div className="space-y-12">
                {filteredCollections.map((item) => (
                  <div key={item.collection.id} className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1d1d1f] mb-1">
                        {item.collection.name.charAt(0).toUpperCase() + item.collection.name.slice(1)}
                      </h2>
                      {item.collection.description && (
                        <p className="text-gray-600 text-sm">
                          {item.collection.description}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">
                        {item.designs.length} {item.designs.length === 1 ? 'template' : 'templates'}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {item.designs.map((design) => (
                        <ContextMenu.Root key={design.id}>
                          <ContextMenu.Trigger className="block">
                              <Link
                                href={`/editor?template=${design.id}`}
                                className="group relative block w-full aspect-[4/5] rounded-xl overflow-hidden bg-white/80 backdrop-blur-xl border border-gray-200 hover:shadow-2xl hover:shadow-[#7c3aed]/10 transition-all duration-300 hover:-translate-y-1"
                              >
                                <div className="absolute inset-0 w-full h-full">
                                  <Image
                                    src={design.image_url}
                                    alt={design.title || 'Template'}
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                              <h3 className="font-semibold text-base mb-1 truncate">
                                {design.title || 'Untitled Template'}
                              </h3>
                              <p className="text-xs text-white/90 font-medium mb-1">
                                {item.collection.name}
                              </p>
                              {design.tags && design.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {design.tags.slice(0, 3).map((tag, index) => (
                                    <span
                                      key={index}
                                      className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-[10px] text-white/90 font-medium"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {design.tags.length > 3 && (
                                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-[10px] text-white/90 font-medium">
                                      +{design.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                              </Link>
                          </ContextMenu.Trigger>
                          {userRole === 'admin' && (
                            <ContextMenu.Portal>
                              <ContextMenu.Positioner>
                            <ContextMenu.Popup className="bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[180px]">
                              <ContextMenu.Item
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Delete Template clicked for template:', design.id);
                                  setContextMenuTemplateId(design.id);
                                  setShowDeleteConfirm(true);
                                }}
                                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                              >
                                Delete Template
                              </ContextMenu.Item>
                            </ContextMenu.Popup>
                              </ContextMenu.Positioner>
                            </ContextMenu.Portal>
                          )}
                        </ContextMenu.Root>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <AlertDialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200">
              <AlertDialog.Title className="text-xl font-semibold mb-2 text-[#1d1d1f]">
                Delete Template
              </AlertDialog.Title>
              <AlertDialog.Description className="text-gray-600 mb-6">
                Are you sure you want to delete this template? This action cannot be undone.
              </AlertDialog.Description>
              <div className="flex gap-3 justify-end">
                <AlertDialog.Close className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancel
                </AlertDialog.Close>
                <button
                  onClick={handleDeleteTemplate}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Template
                </button>
              </div>
            </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

