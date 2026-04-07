/**
 * ============================================================================
 * FIREBASE FIRESTORE SECURITY RULES
 * ============================================================================
 * 
 * Copy these rules to your Firebase Console -> Firestore -> Rules
 * 
 * These rules implement:
 * - Role-based access control (Staff, HOD, Admin)
 * - Department-based data isolation
 * - User data protection
 * 
 * ============================================================================
 */

export const FIRESTORE_SECURITY_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    
    // Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Get user document data (may be absent for brand-new accounts)
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    // Safe role lookup: avoids hard-failing when user doc doesn't exist yet
    function getUserRole() {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid))
        ? getUserData().role
        : null;
    }
    
    // Check user role
    function hasRole(role) {
      return isAuthenticated() && getUserRole() == role;
    }
    
    // Check if user is admin
    function isAdmin() {
      return hasRole('admin');
    }
    
    // Check if user is HOD
    function isHOD() {
      return hasRole('hod');
    }
    
    // Check if user is staff
    function isStaff() {
      return hasRole('staff');
    }
    
    // Check if user is owner
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Check if user is in same department
    function isSameDepartment(department, institution, place) {
      let userData = exists(/databases/$(database)/documents/users/$(request.auth.uid))
        ? getUserData()
        : null;
      return userData != null
             && userData.department == department 
             && userData.institution == institution 
             && userData.place == place;
    }
    
    // Check if user is blocked
    function isNotBlocked() {
      return !exists(/databases/$(database)/documents/blocked_users/$(request.auth.uid));
    }
    
    // ========================================================================
    // USERS COLLECTION
    // ========================================================================
    
    match /users/{userId} {
      // Users can read their own profile
      // HOD can read users in their department
      // Admin can read all users
      allow read: if isOwner(userId) 
                  || isAdmin() 
                  || (isHOD() && isSameDepartment(resource.data.department, resource.data.institution, resource.data.place));
      
      // Users can update their own profile (except role)
      allow update: if isOwner(userId) 
                    && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'status'])
                    || isAdmin();
      
      // New user: isOwner(userId) first so we never call getUserData() (doc doesn't exist yet)
      allow create: if isOwner(userId) || isAdmin();
      
      // Only admin can delete
      allow delete: if isAdmin();

      // User-scoped materials: users/{userId}/materials/{materialId} (full content + chunks + topics)
      match /materials/{materialId} {
        allow read: if isOwner(userId)
                    || isAdmin()
                    || (isHOD() && isSameDepartment(resource.data.department, resource.data.institution, resource.data.place));
        allow create: if isOwner(userId) && isNotBlocked() && request.resource.data.staffId == userId;
        allow update, delete: if isOwner(userId) || isAdmin();
        match /chunks/{chunkId} {
          allow read, write: if isOwner(userId) || isAdmin();
        }
        match /topics/{topicId} {
          allow read, write: if isOwner(userId) || isAdmin();
        }
      }
    }
    
    // ========================================================================
    // BLOCKED USERS COLLECTION
    // ========================================================================
    
    match /blocked_users/{userId} {
      // User can read their own doc (so login can check if blocked); admin can read/write all
      allow read: if isAdmin() || request.auth.uid == userId;
      allow write: if isAdmin();
    }
    
    // Phone → existing account lookup (for phone login to use same account as email signup)
    match /phone_to_uid/{phone} {
      allow read: if isAuthenticated() && request.auth.token.phone_number == phone;
      allow create: if isAuthenticated() && request.resource.data.uid == request.auth.uid;
      allow update, delete: if false;
    }
    
    // ========================================================================
    // QUESTIONS COLLECTION
    // ========================================================================
    
    match /questions/{questionId} {
      // Staff can read their own questions
      // HOD can read questions in their department
      // Admin can read all
      allow read: if isAuthenticated() && isNotBlocked() && (
                    isOwner(resource.data.staffId) 
                    || isAdmin() 
                    || (isHOD() && isSameDepartment(resource.data.department, resource.data.institution, resource.data.place))
                  );
      
      // Staff can create questions
      allow create: if isStaff() && isNotBlocked() 
                    && request.resource.data.staffId == request.auth.uid;
      
      // Staff can update their own draft questions
      // HOD can update questions in their department (for approval)
      // Admin can update all
      allow update: if isAuthenticated() && isNotBlocked() && (
                      (isOwner(resource.data.staffId) && resource.data.status == 'draft')
                      || isAdmin()
                      || (isHOD() && isSameDepartment(resource.data.department, resource.data.institution, resource.data.place))
                    );
      
      // Staff can delete their own drafts
      // Admin can delete all
      allow delete: if isAuthenticated() && isNotBlocked() && (
                      (isOwner(resource.data.staffId) && resource.data.status == 'draft')
                      || isAdmin()
                    );
    }
    
    // Deleted questions (soft delete archive)
    match /deleted_questions/{questionId} {
      allow read: if isAdmin();
      allow write: if isAdmin() || isHOD();
    }
    
    // Generated questions (AI/config-generated)
    match /generated_questions/{questionId} {
      allow read: if isAuthenticated() && isNotBlocked() && (
                    isOwner(resource.data.staffId)
                    || isAdmin()
                    || (isHOD() && isSameDepartment(resource.data.department, resource.data.institution, resource.data.place))
                  );
      allow create: if isStaff() && isNotBlocked()
                    && request.resource.data.staffId == request.auth.uid;
      allow update: if isAuthenticated() && isNotBlocked() && (
                      (isOwner(resource.data.staffId) && resource.data.status == 'draft')
                      || isAdmin()
                      || (isHOD() && isSameDepartment(resource.data.department, resource.data.institution, resource.data.place))
                    );
      allow delete: if isAuthenticated() && isNotBlocked() && (
                      (isOwner(resource.data.staffId) && resource.data.status == 'draft')
                      || isAdmin()
                    );
    }
    
    // ========================================================================
    // MATERIALS COLLECTION
    // ========================================================================
    
    match /materials/{materialId} {
      // Users can read their own materials; HOD can read same-department materials; Admin can read all
      allow read: if isAuthenticated() && isNotBlocked() && (
                    isOwner(resource.data.staffId)
                    || isAdmin()
                    || (isHOD() && isSameDepartment(resource.data.department, resource.data.institution, resource.data.place))
                  );
      
      // Staff can create materials
      allow create: if isStaff() && isNotBlocked() 
                    && request.resource.data.staffId == request.auth.uid;
      
      // Staff can update their own materials
      allow update: if isAuthenticated() && isNotBlocked() && (
                      isOwner(resource.data.staffId) || isAdmin()
                    );
      
      // Staff can delete their own materials
      allow delete: if isAuthenticated() && isNotBlocked() && (
                      isOwner(resource.data.staffId) || isAdmin()
                    );

      // Material chunks subcollection (same access as parent material)
      match /chunks/{chunkId} {
        allow read: if isAuthenticated() && isNotBlocked() && (
                      isOwner(get(/databases/$(database)/documents/materials/$(materialId)).data.staffId)
                      || isAdmin()
                      || (isHOD() && isSameDepartment(get(/databases/$(database)/documents/materials/$(materialId)).data.department, get(/databases/$(database)/documents/materials/$(materialId)).data.institution, get(/databases/$(database)/documents/materials/$(materialId)).data.place))
                    );
        allow write: if isAuthenticated() && isNotBlocked() && (
                       isOwner(get(/databases/$(database)/documents/materials/$(materialId)).data.staffId) || isAdmin()
                     );
      }

      // Material topics subcollection (same access as parent material)
      match /topics/{topicId} {
        allow read: if isAuthenticated() && isNotBlocked() && (
                      isOwner(get(/databases/$(database)/documents/materials/$(materialId)).data.staffId)
                      || isAdmin()
                      || (isHOD() && isSameDepartment(get(/databases/$(database)/documents/materials/$(materialId)).data.department, get(/databases/$(database)/documents/materials/$(materialId)).data.institution, get(/databases/$(database)/documents/materials/$(materialId)).data.place))
                    );
        allow write: if isAuthenticated() && isNotBlocked() && (
                       isOwner(get(/databases/$(database)/documents/materials/$(materialId)).data.staffId) || isAdmin()
                     );
      }
    }
    
    // ========================================================================
    // PAPERS COLLECTION
    // ========================================================================
    
    match /papers/{paperId} {
      // Staff can read their own papers
      // HOD can read papers in their department
      // Admin can read all
      allow read: if isAuthenticated() && isNotBlocked() && (
                    isOwner(resource.data.staffId)
                    || isAdmin()
                    || (isHOD() && isSameDepartment(resource.data.department, resource.data.institution, resource.data.place))
                  );
      
      // Staff can create papers
      allow create: if isStaff() && isNotBlocked() 
                    && request.resource.data.staffId == request.auth.uid;
      
      // Staff can update their own draft papers
      // HOD can update papers in their department
      // Admin can update all
      allow update: if isAuthenticated() && isNotBlocked() && (
                      (isOwner(resource.data.staffId) && resource.data.status == 'draft')
                      || isAdmin()
                      || (isHOD() && isSameDepartment(resource.data.department, resource.data.institution, resource.data.place))
                    );
      
      // Staff can delete their own drafts
      // Admin can delete all
      allow delete: if isAuthenticated() && isNotBlocked() && (
                      (isOwner(resource.data.staffId) && resource.data.status == 'draft')
                      || isAdmin()
                    );
    }
    
    // Deleted papers
    match /deleted_papers/{paperId} {
      allow read: if isAdmin();
      allow write: if isAdmin() || isHOD();
    }
    
    // ========================================================================
    // NOTIFICATIONS COLLECTION
    // ========================================================================
    
    match /notifications/{notificationId} {
      // Users can read notifications addressed to their role
      allow read: if isAuthenticated() && isNotBlocked() && (
                    resource.data.toRole == getUserData().role
                    || resource.data.toUserId == request.auth.uid
                    || isAdmin()
                  );
      
      // Any authenticated user can create notifications
      allow create: if isAuthenticated() && isNotBlocked();
      
      // Users can mark their notifications as read
      allow update: if isAuthenticated() && isNotBlocked() && (
                      resource.data.toRole == getUserData().role
                      || resource.data.toUserId == request.auth.uid
                      || isAdmin()
                    );
      
      // Admin can delete notifications
      allow delete: if isAdmin();
    }
    
    // ========================================================================
    // CHAT SESSIONS COLLECTION
    // ========================================================================
    
    match /chat_sessions/{sessionId} {
      // Users can read their own sessions
      allow read: if isAuthenticated() && isNotBlocked() && (
                    isOwner(resource.data.userId) || isAdmin()
                  );
      
      // Users can create sessions
      allow create: if isAuthenticated() && isNotBlocked() 
                    && request.resource.data.userId == request.auth.uid;
      
      // Users can update their own sessions
      allow update: if isAuthenticated() && isNotBlocked() && (
                      isOwner(resource.data.userId) || isAdmin()
                    );
      
      // Users can delete their own sessions
      allow delete: if isAuthenticated() && isNotBlocked() && (
                      isOwner(resource.data.userId) || isAdmin()
                    );
      
      // Subcollection: messages
      match /messages/{messageId} {
        allow read, write: if isAuthenticated() && isNotBlocked() && (
                            get(/databases/$(database)/documents/chat_sessions/$(sessionId)).data.userId == request.auth.uid
                            || isAdmin()
                          );
      }
    }

    // ========================================================================
    // CHAT SHARES COLLECTION (public share links)
    // ========================================================================

    match /chat_shares/{shareId} {
      // Public read for public shares; owner/admin can read as well
      allow read: if (resource.data.isPublic == true)
                  || (isAuthenticated() && isNotBlocked() && (isOwner(resource.data.userId) || isAdmin()));

      // Only owner can create/update/delete
      allow create: if isAuthenticated() && isNotBlocked()
                    && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && isNotBlocked()
                            && (isOwner(resource.data.userId) || isAdmin());
    }
    
    // ========================================================================
    // QUESTION BANK COLLECTION
    // ========================================================================
    
    match /question_bank/{questionId} {
      // Users can read their own bank items
      allow read: if isAuthenticated() && isNotBlocked() && (
                    isOwner(resource.data.userId) || isAdmin()
                  );
      
      // Users can create bank items
      allow create: if isAuthenticated() && isNotBlocked() 
                    && request.resource.data.userId == request.auth.uid;
      
      // Users can update their own items
      allow update: if isAuthenticated() && isNotBlocked() && (
                      isOwner(resource.data.userId) || isAdmin()
                    );
      
      // Users can delete their own items
      allow delete: if isAuthenticated() && isNotBlocked() && (
                      isOwner(resource.data.userId) || isAdmin()
                    );
    }
    
    // ========================================================================
    // SECURITY HISTORY COLLECTION
    // ========================================================================
    
    match /security_history/{entryId} {
      // HOD and Admin can read security history
      allow read: if isAuthenticated() && isNotBlocked() && (
                    isHOD() || isAdmin()
                  );
      
      // System can create entries (any authenticated user with role)
      allow create: if isAuthenticated() && isNotBlocked();
      
      // No updates or deletes
      allow update, delete: if false;
    }
    
    // ========================================================================
    // FEEDBACKS COLLECTION
    // ========================================================================
    
    match /feedbacks/{feedbackId} {
      // Admin can read all feedbacks
      allow read: if isAdmin();
      
      // Anyone can create feedback
      allow create: if true;
      
      // No updates or deletes
      allow update, delete: if isAdmin();
    }
    
    // ========================================================================
    // CONFIGURATION COLLECTIONS
    // ========================================================================
    
    match /exam_types/{examTypeId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    match /departments/{departmentId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    match /question_types/{typeId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // ========================================================================
    // APP SETTINGS COLLECTION
    // ========================================================================
    
    match /app_settings/logo {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /app_settings/{settingId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // ========================================================================
    // USER ACTIVITIES COLLECTION
    // ========================================================================
    
    match /user_activities/{activityId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }
    
    // ========================================================================
    // NOTIFICATION SETTINGS COLLECTION
    // ========================================================================
    
    match /notification_settings/{userId} {
      allow read, write: if isOwner(userId) || isAdmin();
    }
  }
}
`;

/**
 * Firebase Storage Security Rules
 * Copy to Firebase Console -> Storage -> Rules
 */
export const STORAGE_SECURITY_RULES = `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Materials folder - user can only access their own
    match /materials/{userId}/{allPaths=**} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId) 
                   && request.resource.size < 50 * 1024 * 1024  // 50MB limit
                   && request.resource.contentType.matches('application/pdf|application/msword|application/vnd.openxmlformats.*|text/plain');
    }
    
    // Avatars folder
    match /avatars/{userId}/{allPaths=**} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId) 
                   && request.resource.size < 5 * 1024 * 1024  // 5MB limit
                   && request.resource.contentType.matches('image/.*');
    }
    
    // App assets (public)
    match /assets/{allPaths=**} {
      allow read: if true;
      allow write: if false;  // Admin-only via console
    }
  }
}
`;

/**
 * Firestore Indexes
 * Export and import via Firebase CLI
 */
export const FIRESTORE_INDEXES = {
  indexes: [
    {
      collectionGroup: "questions",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "staffId", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "questions",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "department", order: "ASCENDING" },
        { fieldPath: "institution", order: "ASCENDING" },
        { fieldPath: "place", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "questions",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "status", order: "ASCENDING" },
        { fieldPath: "department", order: "ASCENDING" },
        { fieldPath: "institution", order: "ASCENDING" },
        { fieldPath: "place", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "papers",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "staffId", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "papers",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "department", order: "ASCENDING" },
        { fieldPath: "institution", order: "ASCENDING" },
        { fieldPath: "place", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "notifications",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "toRole", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "notifications",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "toRole", order: "ASCENDING" },
        { fieldPath: "department", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "notifications",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "toRole", order: "ASCENDING" },
        { fieldPath: "isRead", order: "ASCENDING" }
      ]
    },
    {
      collectionGroup: "security_history",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "department", order: "ASCENDING" },
        { fieldPath: "timestamp", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "chat_sessions",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "userId", order: "ASCENDING" },
        { fieldPath: "updatedAt", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "question_bank",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "userId", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    },
    {
      collectionGroup: "materials",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "staffId", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" }
      ]
    }
  ],
  fieldOverrides: []
};

export default { FIRESTORE_SECURITY_RULES, STORAGE_SECURITY_RULES, FIRESTORE_INDEXES };
