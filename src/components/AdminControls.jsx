import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { convertToDirectLink } from '../utils/imageUtils';

const AdminControls = ({ onClose }) => {
  const [wallpaperUrl, setWallpaperUrl] = useState('');
  const [deleteDuration, setDeleteDuration] = useState(24);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.wallpaperUrl) setWallpaperUrl(data.wallpaperUrl);
          if (data.deleteDuration) setDeleteDuration(data.deleteDuration);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (wallpaperUrl) {
        setPreviewUrl(convertToDirectLink(wallpaperUrl));
    } else {
        setPreviewUrl('');
    }
  }, [wallpaperUrl]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    const finalUrl = convertToDirectLink(wallpaperUrl);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        wallpaperUrl: finalUrl,
        deleteDuration: Number(deleteDuration)
      }, { merge: true });
      // Update local state to reflect what was saved
      setWallpaperUrl(finalUrl);
      setMsg('Settings saved successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
      setMsg('Error saving settings.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white p-6 rounded-lg w-full max-w-md relative my-8">
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
        <h2 className="text-2xl font-bold mb-4">Admin Controls</h2>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Global Wallpaper URL
            </label>
            <input 
              type="text" 
              value={wallpaperUrl}
              onChange={(e) => setWallpaperUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter a direct link to an image (Google Photos/Drive link). 
              <br/>For Google Drive, ensure sharing is "Anyone with link".
            </p>
            {previewUrl && (
                <div className="mt-2">
                    <p className="text-xs font-bold mb-1">Preview:</p>
                    <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="w-full h-32 object-cover rounded border" 
                        onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = '';
                            e.target.alt = 'Invalid Image URL';
                        }}
                    />
                </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Auto-Delete Duration (Hours)
            </label>
            <input 
              type="number" 
              value={deleteDuration}
              onChange={(e) => setDeleteDuration(e.target.value)}
              min="1"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end pt-4">
             <button 
               type="submit" 
               disabled={loading}
               className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
             >
               {loading ? 'Saving...' : 'Save Settings'}
             </button>
          </div>
          {msg && <p className={`text-center text-sm ${msg.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{msg}</p>}
        </form>
      </div>
    </div>
  );
};

export default AdminControls;
