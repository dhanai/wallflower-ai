'use client';

import { useState, useEffect } from 'react';
import { AlertDialog } from '@base-ui-components/react/alert-dialog';
import { useToast } from '@/hooks/useToast';

interface Collection {
  id: string;
  name: string;
  description?: string;
}

interface CollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designId: string | null;
  onSave?: () => void; // Optional callback after successful save
}

export default function CollectionModal({ 
  open, 
  onOpenChange, 
  designId,
  onSave 
}: CollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionTags, setCollectionTags] = useState<string>('');
  const [designCollections, setDesignCollections] = useState<Collection[]>([]);
  const [savingToCollection, setSavingToCollection] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const toast = useToast();

  // Load collections and design collections when modal opens
  useEffect(() => {
    async function loadCollectionData() {
      if (!open || !designId) return;
      
      try {
        const [collectionsResponse, designCollectionsResponse] = await Promise.all([
          fetch('/api/collections/list'),
          fetch(`/api/collections/design-collections?designId=${designId}`),
        ]);

        if (collectionsResponse.ok) {
          const { collections: data } = await collectionsResponse.json();
          setCollections(data || []);
          setFilteredCollections(data || []);
        }

        if (designCollectionsResponse.ok) {
          const { collections: designCols } = await designCollectionsResponse.json();
          setDesignCollections(designCols || []);
        }
      } catch (error) {
        console.error('Error loading collection data:', error);
      }
    }
    loadCollectionData();
  }, [open, designId]);

  // Filter collections based on search
  useEffect(() => {
    if (!collectionSearchQuery.trim()) {
      setFilteredCollections(collections);
      return;
    }

    const query = collectionSearchQuery.toLowerCase();
    const filtered = collections.filter(collection => 
      collection.name?.toLowerCase().includes(query)
    );
    setFilteredCollections(filtered);
  }, [collectionSearchQuery, collections]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedCollectionId(null);
      setCollectionTags('');
      setCollectionSearchQuery('');
      setNewCollectionName('');
    }
  }, [open]);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast.error('Please enter a collection name');
      return;
    }

    try {
      const response = await fetch('/api/collections/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollectionName.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create collection');
      }

      const { collection } = await response.json();
      setCollections(prev => [...prev, collection]);
      setFilteredCollections(prev => [...prev, collection]);
      setSelectedCollectionId(collection.id);
      setNewCollectionName('');
      setShowCreateCollection(false);
      toast.success('Collection created!');
    } catch (error: any) {
      console.error('Error creating collection:', error);
      toast.error(error.message || 'Failed to create collection');
    }
  };

  const handleSaveToCollection = async () => {
    if (!designId || !selectedCollectionId) {
      toast.error('Please select a collection');
      return;
    }

    setSavingToCollection(true);
    try {
      const tags = collectionTags
        ? collectionTags.split(',').map(t => t.trim()).filter(t => t)
        : [];

      const response = await fetch('/api/collections/add-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId,
          collectionId: selectedCollectionId,
          tags,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add design to collection');
      }

      toast.success('Design saved to collection! You can add it to more collections if needed.');
      
      // Refresh design collections
      const designCollectionsResponse = await fetch(`/api/collections/design-collections?designId=${designId}`);
      if (designCollectionsResponse.ok) {
        const { collections: designCols } = await designCollectionsResponse.json();
        setDesignCollections(designCols || []);
      }
      
      // Don't close modal - allow adding to multiple collections
      setSelectedCollectionId(null);
      setCollectionTags('');
      
      // Call optional callback
      if (onSave) {
        onSave();
      }
    } catch (error: any) {
      console.error('Error adding to collection:', error);
      toast.error(error.message || 'Failed to add design to collection');
    } finally {
      setSavingToCollection(false);
    }
  };

  return (
    <>
      {/* Add to Collection Dialog */}
      <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <AlertDialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <AlertDialog.Title className="text-xl font-semibold text-[#1d1d1f]">
                  Collections
                </AlertDialog.Title>
                {designCollections.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Design is in {designCollections.length} {designCollections.length === 1 ? 'collection' : 'collections'}
                  </p>
                )}
              </div>
              <AlertDialog.Close className="p-2 text-gray-600 hover:text-[#1d1d1f] hover:bg-gray-100 rounded-lg">✕</AlertDialog.Close>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 512 512" 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="currentColor"
              >
                <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/>
              </svg>
              <input
                type="text"
                placeholder="Search collections..."
                value={collectionSearchQuery}
                onChange={(e) => setCollectionSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition-all text-[#1d1d1f] placeholder-gray-400 text-sm"
              />
            </div>

            {/* Add New Collection Button */}
            <button
              onClick={() => setShowCreateCollection(true)}
              className="flex items-center gap-2 px-3 py-2 mb-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-[#1d1d1f]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4" fill="currentColor">
                <path d="M320 48C337.7 48 352 62.3 352 80L352 288L560 288C577.7 288 592 302.3 592 320C592 337.7 577.7 352 560 352L352 352L352 560C352 577.7 337.7 592 320 592C302.3 592 288 577.7 288 560L288 352L80 352C62.3 352 48 337.7 48 320C48 302.3 62.3 288 80 288L288 288L288 80C288 62.3 302.3 48 320 48z"/>
              </svg>
              Add new collection
            </button>

            {/* Collections List */}
            <div className="flex-1 overflow-y-auto space-y-1 mb-4">
              {filteredCollections.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  {collectionSearchQuery ? 'No collections found' : 'No collections yet'}
                </div>
              ) : (
                filteredCollections.map((collection) => {
                  const isAlreadyInCollection = designCollections.some(dc => dc.id === collection.id);
                  return (
                    <button
                      key={collection.id}
                      onClick={() => setSelectedCollectionId(collection.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                        selectedCollectionId === collection.id
                          ? 'bg-[#7c3aed]/10 text-[#7c3aed]'
                          : 'hover:bg-gray-100 text-[#1d1d1f]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        selectedCollectionId === collection.id
                          ? 'border-[#7c3aed] bg-[#7c3aed]'
                          : 'border-gray-300'
                      }`}>
                        {selectedCollectionId === collection.id && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-3 h-3 text-white" fill="currentColor">
                            <path d="M558.6 70.6C542.4 54.4 520 48 497 48C474 48 451.6 54.4 435.4 70.6L288 218L204.6 134.6C188.4 118.4 166 112 143 112C120 112 97.6 118.4 81.4 134.6C49 167 49 218.2 81.4 250.6L190.6 359.8C206.8 376 229.2 382.4 252.2 382.4C275.2 382.4 297.6 376 313.8 359.8L558.6 115C574.8 98.8 574.8 70.6 558.6 70.6z"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium flex-1">{collection.name}</span>
                      {isAlreadyInCollection && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                          Already added
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Tags Input */}
            {selectedCollectionId && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., spooky, halloween, family, costume"
                  value={collectionTags}
                  onChange={(e) => setCollectionTags(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition-all text-[#1d1d1f] placeholder-gray-400 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add tags to make this design easier to find when searching
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <AlertDialog.Close className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Cancel
              </AlertDialog.Close>
              <button
                onClick={handleSaveToCollection}
                disabled={!selectedCollectionId || savingToCollection}
                className="px-4 py-2 text-sm text-white bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingToCollection ? 'Saving...' : 'Save'}
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Create Collection Dialog */}
      <AlertDialog.Root open={showCreateCollection} onOpenChange={setShowCreateCollection}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <AlertDialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 max-w-md">
            <div className="flex items-center justify-between mb-4">
              <AlertDialog.Title className="text-xl font-semibold text-[#1d1d1f]">
                Create Collection
              </AlertDialog.Title>
              <AlertDialog.Close className="p-2 text-gray-600 hover:text-[#1d1d1f] hover:bg-gray-100 rounded-lg">✕</AlertDialog.Close>
            </div>

            <AlertDialog.Description className="text-gray-600 mb-4">
              Enter a name for your new collection.
            </AlertDialog.Description>

            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCollectionName.trim()) {
                  handleCreateCollection();
                }
              }}
              placeholder="Collection name"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition-all text-[#1d1d1f] placeholder-gray-400 text-sm mb-4"
            />

            <div className="flex gap-3 justify-end">
              <AlertDialog.Close className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Cancel
              </AlertDialog.Close>
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
                className="px-4 py-2 text-sm text-white bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

