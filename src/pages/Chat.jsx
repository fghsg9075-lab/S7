import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage } from "../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  updateDoc,
  doc,
  where,
  deleteDoc,
  getDocs,
  setDoc,
  getDoc,
  arrayUnion
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from "../context/AuthContext";
import { v4 as uuidv4 } from "uuid";
import DeleteModal from "../components/DeleteModal";

const Chat = () => {
  const { userId } = useParams();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [wallpaperUrl, setWallpaperUrl] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedMsgForDelete, setSelectedMsgForDelete] = useState(null);
  const [viewWallpaper, setViewWallpaper] = useState(false);
  const navigate = useNavigate();
  const bottomRef = useRef(null);

  // Generate a unique chat ID based on user IDs (sorted to ensure consistency)
  const chatId = currentUser.uid > userId 
    ? `${currentUser.uid}-${userId}` 
    : `${userId}-${currentUser.uid}`;

  useEffect(() => {
    // Listen for global settings (Wallpaper & Auto-Delete)
    const unsubscribeSettings = onSnapshot(doc(db, "settings", "global"), (docSnapshot) => {
        if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            // Use local state update which might propagate valid url
            if (data.wallpaperUrl) setWallpaperUrl(data.wallpaperUrl);
            
            // Auto Delete Logic
            const duration = data.deleteDuration || 24; // Default 24 hours
            const durationMs = duration * 60 * 60 * 1000;
            const cutoff = Timestamp.fromMillis(Date.now() - durationMs);
            
            const performCleanup = async () => {
                try {
                    const qDelete = query(
                        collection(db, "chats", chatId, "messages"),
                        where("createdAt", "<", cutoff)
                    );
                    const snapshot = await getDocs(qDelete);
                    const promises = [];
                    snapshot.forEach((d) => {
                        // Skip saved messages
                        if (!d.data().saved) {
                             promises.push(deleteDoc(d.ref));
                        }
                    });
                    await Promise.all(promises);
                } catch (err) {
                    console.error("Cleanup error:", err);
                }
            };
            performCleanup();
        }
    });

    // Listener for messages
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribeMsgs = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
      
      // Mark unseen messages as seen
      msgs.forEach(async (msg) => {
          if (msg.senderId !== currentUser.uid && !msg.seen) {
             try {
                const msgRef = doc(db, "chats", chatId, "messages", msg.id);
                await updateDoc(msgRef, { seen: true });
             } catch (e) {
                 console.error("Error marking seen:", e);
             }
          }
      });
    });

    return () => {
        unsubscribeSettings();
        unsubscribeMsgs();
    };
  }, [chatId, currentUser.uid]);
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text) return;

    setLoading(true);

    try {
      await sendMessage(text, null, "text");
      setText("");
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const sendMessage = async (msgText, mediaUrl, msgType) => {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: msgText,
        senderId: currentUser.uid,
        createdAt: Timestamp.now(),
        seen: false,
        saved: false,
        ...(mediaUrl && { url: mediaUrl, type: msgType }),
      });
  };

  const toggleSave = async (msgId, currentStatus) => {
      const msgRef = doc(db, "chats", chatId, "messages", msgId);
      await updateDoc(msgRef, { saved: !currentStatus });
  };

  const openDeleteModal = (msg) => {
      setSelectedMsgForDelete(msg);
      setDeleteModalOpen(true);
  };

  const handleDeleteForMe = async () => {
      if (!selectedMsgForDelete) return;
      try {
          const msgRef = doc(db, "chats", chatId, "messages", selectedMsgForDelete.id);
          await updateDoc(msgRef, { deletedFor: arrayUnion(currentUser.uid) });
      } catch (err) {
          console.error("Error deleting for me:", err);
      }
      setDeleteModalOpen(false);
      setSelectedMsgForDelete(null);
  };

  const handleDeleteForEveryone = async () => {
      if (!selectedMsgForDelete) return;
      try {
          const msgRef = doc(db, "chats", chatId, "messages", selectedMsgForDelete.id);
          await deleteDoc(msgRef);
      } catch (err) {
          console.error("Error deleting for everyone:", err);
      }
      setDeleteModalOpen(false);
      setSelectedMsgForDelete(null);
  };

  const handleBackgroundClick = (e) => {
      // Only open wallpaper if clicking the container directly (empty space)
      if (e.target === e.currentTarget && wallpaperUrl) {
          setViewWallpaper(true);
      }
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-100 relative">
      <DeleteModal 
        isOpen={deleteModalOpen} 
        onClose={() => { setDeleteModalOpen(false); setSelectedMsgForDelete(null); }}
        onDeleteForMe={handleDeleteForMe}
        onDeleteForEveryone={handleDeleteForEveryone}
        showEveryoneOption={selectedMsgForDelete?.senderId === currentUser.uid || currentUser.role === 'admin'}
      />
      
      {/* Wallpaper View Modal */}
      {viewWallpaper && wallpaperUrl && (
          <div 
             className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4 cursor-pointer"
             onClick={() => setViewWallpaper(false)}
          >
              <img 
                 src={wallpaperUrl} 
                 alt="Wallpaper" 
                 className="max-w-full max-h-full rounded shadow-lg" 
                 onError={(e) => { e.target.style.display = 'none'; alert("Failed to load image. Check the URL."); }}
              />
          </div>
      )}

      {/* Background Wallpaper Layer */}
      {wallpaperUrl && (
          <div 
            className="absolute inset-0 z-0 opacity-60 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: `url(${wallpaperUrl})` }}
          />
      )}

      <header className="bg-blue-600 p-4 text-white flex items-center justify-between shadow-md z-10 relative">
        <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="mr-4 font-bold text-xl">
            &larr;
            </button>
            <h1 className="text-lg font-bold">Chat</h1>
        </div>
      </header>

      {/* Message List Container acts as click area for wallpaper */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 z-10 relative cursor-pointer"
        onClick={handleBackgroundClick}
        title={wallpaperUrl ? "Click empty space to view wallpaper" : ""}
      >
        {messages.map((msg) => {
            // Check if deleted for current user
            if (msg.deletedFor && msg.deletedFor.includes(currentUser.uid)) return null;

            const isMe = msg.senderId === currentUser.uid;
            return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group cursor-default`}>
                    <div 
                        className={`max-w-xs md:max-w-md p-3 rounded-lg relative ${isMe ? "bg-blue-500 text-white" : "bg-white text-gray-800"}`}
                        onClick={(e) => e.stopPropagation()} // Prevent bubble click from triggering wallpaper
                    >
                        {msg.type === "image" && (
                            <img src={msg.url} alt="Shared" className="rounded mb-2 max-h-64 object-cover" />
                        )}
                        {msg.type === "video" && (
                            <video src={msg.url} controls className="rounded mb-2 max-h-64" />
                        )}
                        {msg.text && <p>{msg.text}</p>}
                        
                        <div className="flex items-center justify-end mt-1 gap-2">
                             {/* Save Button */}
                             <button 
                                onClick={() => toggleSave(msg.id, msg.saved)}
                                className={`text-xs ${msg.saved ? "text-yellow-400 font-bold" : "text-gray-400 hover:text-yellow-300"}`}
                                title={msg.saved ? "Unsave" : "Save to prevent deletion"}
                             >
                                 {msg.saved ? "★ Saved" : "☆"}
                             </button>

                             {/* Delete Button (Available for all messages, options vary) */}
                             <button 
                                onClick={() => openDeleteModal(msg)}
                                className="text-xs text-red-300 hover:text-red-100"
                                title="Delete options"
                             >
                                 🗑
                             </button>

                            <div className={`text-xs ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                                {isMe && (
                                    <span>
                                        {msg.seen ? (
                                            <span className="text-green-300 font-bold">✓✓</span>
                                        ) : (
                                            <span>✓</span>
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-white border-t flex items-center gap-2 z-10 relative">
         <input 
            type="text" 
            value={text} 
            onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-600"
         />
         <button type="submit" disabled={loading || !text.trim()} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 min-w-[40px] flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
         </button>
      </form>
    </div>
  );
};

export default Chat;
