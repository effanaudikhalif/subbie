import React from 'react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header with title and X button */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 -mx-6 px-6">
          <h3 className="text-lg merriweather-bold text-black">Privacy Policy</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="text-sm merriweather-regular text-black">
            <p className="mb-3">
              At Subbie, we are committed to protecting the privacy and security of our users. This Privacy Policy summarizes how we collect, use, and protect your information when you use our platform.
            </p>

            <div className="mb-3">
              <h4 className="font-semibold mb-2 text-black">1. Information We Collect</h4>
              <ul className="space-y-1 ml-4 text-black">
                <li>• <strong>Email Address:</strong> We collect your .edu email address to verify student status.</li>
                <li>• <strong>Profile Information:</strong> This may include your name, university, and other information you voluntarily provide.</li>
                <li>• <strong>Listing Data:</strong> Includes general location (radius), price, photos, and descriptions you submit as part of a listing.</li>
                <li>• <strong>Communication Data:</strong> Messages exchanged between users on the platform.</li>
                <li>• <strong>Usage Data:</strong> Basic metadata such as timestamps, login activity, and browser information for analytics and platform improvement.</li>
              </ul>
            </div>

            <div className="mb-3">
              <h4 className="font-semibold mb-2 text-black">2. What We Do Not Collect</h4>
              <ul className="space-y-1 ml-4 text-black">
                <li>• We do not collect or store payment or financial information.</li>
                <li>• We do not sell, rent, or share your personal data with third parties.</li>
                <li>• We do not track your activity across other websites or apps.</li>
              </ul>
            </div>

            <div className="mb-3">
              <h4 className="font-semibold mb-2 text-black">3. Security of Your Information</h4>
              <ul className="space-y-1 ml-4 text-black">
                <li>• Passwords are securely hashed using Supabase Auth and are never stored in plain text.</li>
                <li>• All data is encrypted in transit using HTTPS protocols.</li>
                <li>• Access to your account and personal data is restricted to authorized personnel only, for legitimate business purposes.</li>
              </ul>
            </div>

            <div className="mb-3">
              <h4 className="font-semibold mb-2 text-black">4. Location and Map Privacy</h4>
              <ul className="space-y-1 ml-4 text-black">
                <li>• Exact addresses are never made publicly visible on Subbie.</li>
                <li>• Listings are displayed using an approximate radius only.</li>
                <li>• Zooming is restricted to prevent pinpointing the precise location of any listing.</li>
              </ul>
            </div>

            <div className="mb-3">
              <h4 className="font-semibold mb-2 text-black">5. Your Rights and Control</h4>
              <ul className="space-y-1 ml-4 text-black">
                <li>• You may update or delete your listing(s) at any time.</li>
                <li>• You may request the deletion of your account and associated data by contacting us at subbie.founder@gmail.com.</li>
                <li>• We comply with applicable privacy regulations regarding student data and online services.</li>
              </ul>
            </div>

            <div className="mb-3">
              <h4 className="font-semibold mb-2 text-black">6. Contact</h4>
              <p className="text-black">
                If you have any questions or concerns about this Privacy Policy or your data, please contact us at subbie.founder@gmail.com.
              </p>
            </div>

            <p className="pt-2 border-t border-gray-200 text-black">
              By using Subbie, you acknowledge and agree to the terms outlined in this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal; 