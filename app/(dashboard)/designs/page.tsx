'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ContextMenu } from '@base-ui-components/react/context-menu';
import { AlertDialog } from '@base-ui-components/react/alert-dialog';
import { useToast } from '@/hooks/useToast';
import CollectionModal from '@/components/CollectionModal';

interface Design {
  id: string;
  title: string;
  image_url: string;
  created_at: string;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
}

export default function DesignsPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [filteredDesigns, setFilteredDesigns] = useState<Design[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [contextMenuDesignId, setContextMenuDesignId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const toast = useToast();

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


  useEffect(() => {
    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Loading timeout reached, setting loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    async function loadDesigns() {
      try {
        console.log('Loading designs via API...');
        
        const response = await fetch('/api/designs/list');
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API error:', response.status, errorData);
          setDesigns([]);
          setFilteredDesigns([]);
          return;
        }
        
        const { designs: data, error } = await response.json();

        console.log('Designs received:', data?.length || 0);
        
        if (error) {
          console.error('API returned error:', error);
          setDesigns([]);
          setFilteredDesigns([]);
          setLoading(false);
          return;
        }
        
        // Data is already processed by API
        setDesigns(data || []);
        setFilteredDesigns(data || []);
        console.log('Designs loaded:', (data || []).length);
      } catch (error) {
        console.error('Error loading designs:', error);
        setDesigns([]);
        setFilteredDesigns([]);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }

    loadDesigns();
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Filter designs based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDesigns(designs);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = designs.filter(design => 
      design.title?.toLowerCase().includes(query)
    );
    setFilteredDesigns(filtered);
  }, [searchQuery, designs]);

  const handleDeleteDesign = async () => {
    if (!contextMenuDesignId) return;

    try {
      const response = await fetch('/api/designs/delete-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId: contextMenuDesignId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete design');
      }

      // Remove from local state
      setDesigns(prev => prev.filter(d => d.id !== contextMenuDesignId));
      setFilteredDesigns(prev => prev.filter(d => d.id !== contextMenuDesignId));
      toast.success('Design deleted successfully');
      setShowDeleteConfirm(false);
      setContextMenuDesignId(null);
    } catch (error: any) {
      console.error('Error deleting design:', error);
      toast.error(error.message || 'Failed to delete design');
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
        {designs.length > 0 && (
          <div className="mb-8 flex flex-col gap-4">
            <div>
              <h1 className="text-4xl md:text-4xl font-bold mb-2 tracking-tighter text-[#1d1d1f]">
                My Designs
              </h1>
              <p className="text-gray-500 text-base md:text-lg">
                {`${designs.length} ${designs.length === 1 ? 'design' : 'designs'}`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              <div className="relative flex-1">
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
                  placeholder="Search designs..."
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
              <Link
                href="/editor"
                className="px-6 py-3 bg-[#7c3aed] text-white rounded-xl hover:bg-[#6d28d9] font-medium tracking-tight transition-all shadow-lg shadow-[#7c3aed]/20 hover:shadow-[#7c3aed]/30 w-fit whitespace-nowrap"
              >
                Create New Design
              </Link>
            </div>
          </div>
        )}

        {designs.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 md:p-16 text-center h-[calc(100vh-60px)] flex items-center justify-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-b from-[#7c3aed] to-[#6d28d9] shadow-2xl shadow-[#7c3aed]/40 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-12 h-12 text-white" fill="currentColor">
                  <path d="M96 128h448v384H96z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-2 tracking-tight text-[#1d1d1f]">
                No designs yet
              </h2>
              <p className="text-gray-500 mb-8">
                Create your first AI-powered design and bring your ideas to life.
              </p>
              <Link
                href="/editor"
                className="inline-block px-8 py-3 bg-[#7c3aed] text-white rounded-xl hover:bg-[#6d28d9] font-medium tracking-tight transition-all shadow-lg shadow-[#7c3aed]/20 hover:shadow-[#7c3aed]/30"
              >
                Create Your First Design
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Design Grid */}
            {filteredDesigns.length === 0 && searchQuery ? (
              <div className="text-center py-16">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor">
                  <path d="M96 128h448v384H96z"/>
                </svg>
                <p className="text-gray-500 mb-2">No designs found matching &quot;{searchQuery}&quot;</p>
                <p className="text-sm text-gray-400">0 results</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredDesigns.map((design) => (
                  <ContextMenu.Root key={design.id}>
                    <ContextMenu.Trigger className="block">
                      <Link
                        href={`/editor?design=${design.id}`}
                        className="group relative block w-full aspect-[4/5] rounded-xl overflow-hidden bg-white/80 backdrop-blur-xl border border-gray-200 hover:shadow-2xl hover:shadow-[#7c3aed]/10 transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="absolute inset-0 w-full h-full">
                          <Image
                            src={design.image_url}
                            alt={design.title || 'Design'}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <h3 className="font-semibold text-base mb-1 truncate">
                          {design.title || 'Untitled Design'}
                        </h3>
                        <p className="text-xs text-white/80 font-light">
                          {new Date(design.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
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
                                  console.log('Add to Collection clicked for design:', design.id);
                                  setContextMenuDesignId(design.id);
                                  setShowAddToCollection(true);
                                }}
                                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                              >
                                Add to Collection
                              </ContextMenu.Item>
                              <ContextMenu.Item
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Delete Design clicked for design:', design.id);
                                  setContextMenuDesignId(design.id);
                                  setShowDeleteConfirm(true);
                                }}
                                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                              >
                                Delete Design
                              </ContextMenu.Item>
                          </ContextMenu.Popup>
                        </ContextMenu.Positioner>
                      </ContextMenu.Portal>
                    )}
                  </ContextMenu.Root>
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
                Delete Design
              </AlertDialog.Title>
              <AlertDialog.Description className="text-gray-600 mb-6">
                Are you sure you want to delete this design? This action cannot be undone and will also delete all iterations.
              </AlertDialog.Description>
              <div className="flex gap-3 justify-end">
                <AlertDialog.Close className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancel
                </AlertDialog.Close>
                <button
                  onClick={handleDeleteDesign}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Design
                </button>
              </div>
            </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Collection Modal */}
      <CollectionModal
        open={showAddToCollection}
        onOpenChange={setShowAddToCollection}
        designId={contextMenuDesignId}
      />
    </div>
  );
}
