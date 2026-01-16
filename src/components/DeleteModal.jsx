import React, { useState } from 'react';

const DeleteModal = ({ isOpen, onClose, onDeleteForMe, onDeleteForEveryone, showEveryoneOption }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-sm">
        <h3 className="text-lg font-bold mb-4">Delete Message?</h3>
        <div className="flex flex-col gap-2">
          <button 
            onClick={onDeleteForMe}
            className="bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300"
          >
            Delete for me
          </button>
          {showEveryoneOption && (
            <button 
              onClick={onDeleteForEveryone}
              className="bg-red-500 text-white py-2 rounded hover:bg-red-600"
            >
              Delete for everyone
            </button>
          )}
          <button 
            onClick={onClose}
            className="mt-2 text-gray-500 hover:text-gray-700 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
