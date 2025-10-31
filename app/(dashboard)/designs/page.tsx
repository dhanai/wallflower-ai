'use client';

import { useCallback, useEffect, useState } from 'react';
import { ContextMenu } from '@base-ui-components/react/context-menu';
import { AlertDialog } from '@base-ui-components/react/alert-dialog';
import { useToast } from '@/hooks/useToast';
import { useUserRole } from '@/hooks/useUserRole';
import { useDataLoader } from '@/hooks/useDataLoader';
import { useSearchFilter } from '@/hooks/useSearchFilter';
import { apiClient } from '@/lib/api/client';
import CollectionModal from '@/components/CollectionModal';
import { SearchInput } from '@/components/ui/SearchInput';
import { LoadingGrid } from '@/components/ui/LoadingGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { DesignThumbnail } from '@/components/DesignThumbnail';
import Link from 'next/link';

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
  const [searchQuery, setSearchQuery] = useState('');
  const { role: userRole } = useUserRole();
  const [contextMenuDesignId, setContextMenuDesignId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const toast = useToast();
  useEffect(() => {
    console.log('[DesignsPage] mounted');
  }, []);
  const fetchDesigns = useCallback(async () => {
    console.debug('[DesignsPage] fetching designs');
    const { designs: data } = await apiClient.get<{ designs: Design[] }>('/api/designs/list');
    console.debug('[DesignsPage] fetched designs count', data?.length ?? 0);
    return data || [];
  }, []);

  const {
    data: designs,
    setData: setDesigns,
    loading,
    error,
  } = useDataLoader<Design[]>({
    fetcher: fetchDesigns,
    initialData: [],
    timeoutMs: 10000,
    onError: (err) => {
      console.error('Failed to load designs', err);
    },
  });

  const filteredDesigns = useSearchFilter(designs, searchQuery, {
    fields: ['title'],
  });

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error, toast]);

  const handleDeleteDesign = async () => {
    if (!contextMenuDesignId) return;

    try {
      await apiClient.post('/api/designs/delete-design', { designId: contextMenuDesignId });

      // Remove from local state
      setDesigns(prev => prev.filter(d => d.id !== contextMenuDesignId));
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
          <LoadingGrid />
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
              <p className="text-gray-500 text-base md:text-md tracking-tight">
                {`${designs.length} ${designs.length === 1 ? 'design' : 'designs'}`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search designs..." />
              <Link
                href="/editor"
                className="px-6 py-3 bg-[#7c3aed] text-white rounded-xl hover:bg-[#6d28d9] text-sm font-bold tracking-tight transition-all w-fit whitespace-nowrap"
              >
                Create New Design
              </Link>
            </div>
          </div>
        )}

        {designs.length === 0 ? (
          <EmptyState
            className="h-[calc(100vh-60px)]"
            icon={
              <div className="w-24 h-24 rounded-full bg-gradient-to-b from-[#7c3aed] to-[#6d28d9] shadow-2xl shadow-[#7c3aed]/40 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-12 h-12 text-white" fill="currentColor">
                  <path d="M96 128h448v384H96z" />
                </svg>
              </div>
            }
            title="No designs yet"
            description="Create your first AI-powered design and bring your ideas to life."
            action={
              <Link
                href="/editor"
                className="inline-block px-8 py-3 bg-[#7c3aed] text-white rounded-xl hover:bg-[#6d28d9] font-medium tracking-tight transition-all shadow-lg shadow-[#7c3aed]/20 hover:shadow-[#7c3aed]/30"
              >
                Create Your First Design
              </Link>
            }
          />
        ) : (
          <>
            {/* Design Grid */}
            {filteredDesigns.length === 0 && searchQuery ? (
              <EmptyState
                className="py-16"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-16 h-16 text-gray-300" fill="currentColor">
                    <path d="M96 128h448v384H96z" />
                  </svg>
                }
                title={`No designs found matching "${searchQuery}"`}
                description="0 results"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredDesigns.map((design) => (
                  <ContextMenu.Root key={design.id}>
                    <ContextMenu.Trigger asChild>
                      <DesignThumbnail
                        href={`/editor?design=${design.id}`}
                        imageUrl={design.image_url}
                        title={design.title || 'Untitled Design'}
                        subtitle={new Date(design.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      />
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
