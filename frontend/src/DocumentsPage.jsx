import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { UploadSimple, FileText, MagnifyingGlass } from '@phosphor-icons/react';
import Sidebar from './components/Sidebar';
import { apiEndpoints } from './config/api';

const ADMIN_REQUESTS_PER_PAGE = 5;

export default function DocumentsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyUpload, setBusyUpload] = useState(false);
  const [busyRequest, setBusyRequest] = useState(false);
  const [busyAdminAction, setBusyAdminAction] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const [documentItems, setDocumentItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ totalDocuments: 0, certifications: 0, requestedDocuments: 0 });
  const [searchText, setSearchText] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDocumentPreviewModal, setShowDocumentPreviewModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [requestForm, setRequestForm] = useState({ requestType: 'Transcript', notes: '' });
  const [user, setUser] = useState(null);
  const [showAdminRequestsModal, setShowAdminRequestsModal] = useState(false);
  const [showAdminRejectModal, setShowAdminRejectModal] = useState(false);
  const [adminRequests, setAdminRequests] = useState([]);
  const [adminStatusFilter, setAdminStatusFilter] = useState('pending');
  const [adminRequestsPage, setAdminRequestsPage] = useState(1);
  const [adminRejectReason, setAdminRejectReason] = useState('');
  const [adminRejectRequestId, setAdminRejectRequestId] = useState('');
  const adminUploadInputRef = useRef(null);
  const [adminUploadRequestId, setAdminUploadRequestId] = useState('');

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeLabel = (filename, category) => {
    const cat = String(category || '').toLowerCase();
    if (cat === 'certificate') return 'Certificate';
    const lower = String(filename || '').toLowerCase();
    if (lower.includes('certificate')) return 'Certificate';
    if (lower.includes('resume') || lower.includes('cv')) return 'Resume';
    return 'Document';
  };

  const formatRelativeTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  const getPreviewKind = (mimeType, filename) => {
    const type = String(mimeType || '').toLowerCase();
    const lowerName = String(filename || '').toLowerCase();
    if (type.startsWith('image/')) return 'image';
    if (type.includes('pdf') || lowerName.endsWith('.pdf')) return 'pdf';
    if (
      type.startsWith('text/') ||
      type.includes('json') ||
      type.includes('csv') ||
      type.includes('xml') ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.json') ||
      lowerName.endsWith('.xml') ||
      lowerName.endsWith('.md')
    ) {
      return 'text';
    }
    return 'unsupported';
  };

  const loadAll = async (opts = {}) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setError('Please login to view your documents.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const q = typeof opts.q === 'string' ? opts.q : searchText;
      const sort = opts.sort || sortOrder;

      const [statsRes, docsRes, requestsRes] = await Promise.all([
        fetch(apiEndpoints.documentStats, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiEndpoints.myDocuments}?q=${encodeURIComponent(q)}&sort=${encodeURIComponent(sort)}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiEndpoints.documentRequests, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const safeJson = async (res) => {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) return res.json();
        const text = await res.text();
        if (text && (text.includes('Cannot GET /api/documents') || text.startsWith('<!DOCTYPE html'))) {
          return { message: 'Documents API not found. Restart backend and make sure it is running on http://localhost:5000.' };
        }
        return { message: text || 'Request failed' };
      };

      if (!statsRes.ok) throw new Error((await safeJson(statsRes))?.message || 'Failed to load stats');
      if (!docsRes.ok) throw new Error((await safeJson(docsRes))?.message || 'Failed to load documents');
      if (!requestsRes.ok) throw new Error((await safeJson(requestsRes))?.message || 'Failed to load requests');

      const statsBody = await statsRes.json();
      const docsBody = await docsRes.json();
      const requestsBody = await requestsRes.json();

      setStats({
        totalDocuments: Number(statsBody?.totalDocuments || 0),
        certifications: Number(statsBody?.certifications || 0),
        requestedDocuments: Number(statsBody?.requestedDocuments || 0),
      });

      const docs = Array.isArray(docsBody?.documents) ? docsBody.documents : [];
      setDocumentItems(docs.map((doc) => ({
        id: doc._id,
        name: doc.originalName,
        type: getFileTypeLabel(doc.originalName, doc.category),
        size: formatFileSize(Number(doc.sizeBytes || 0)),
        time: formatRelativeTime(doc.createdAt),
        category: doc.category,
        url: doc.url,
      })));

      const reqList = Array.isArray(requestsBody?.requests) ? requestsBody.requests : [];
      setRequests(reqList);
    } catch (err) {
      setError(err?.message || 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const modalOpen = showRequestModal || showAdminRequestsModal;
    if (!modalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [showRequestModal, showAdminRequestsModal]);

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('user');
      setUser(rawUser ? JSON.parse(rawUser) : null);
    } catch {
      setUser(null);
    }
  }, []);

  const isAdmin = useMemo(() => {
    const role = String(user?.role || '').toLowerCase();
    return ['super_admin', 'superadmin', 'admin', 'hr', 'alumni_officer'].includes(role);
  }, [user]);

  const adminRequestsTotalPages = useMemo(() => {
    const pages = Math.ceil(adminRequests.length / ADMIN_REQUESTS_PER_PAGE);
    return Math.max(1, pages);
  }, [adminRequests]);

  const paginatedAdminRequests = useMemo(() => {
    const start = (adminRequestsPage - 1) * ADMIN_REQUESTS_PER_PAGE;
    return adminRequests.slice(start, start + ADMIN_REQUESTS_PER_PAGE);
  }, [adminRequests, adminRequestsPage]);

  useEffect(() => {
    setAdminRequestsPage((prev) => Math.min(prev, adminRequestsTotalPages));
  }, [adminRequestsTotalPages]);

  useEffect(() => () => {
    if (previewDocument?.url) URL.revokeObjectURL(previewDocument.url);
  }, [previewDocument]);

  const handleFiles = async (files) => {
    const fileList = Array.from(files || []);
    if (fileList.length === 0) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to upload documents.');
      return;
    }

    setBusyUpload(true);
    setError('');
    try {
      for (const file of fileList) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(apiEndpoints.uploadDocument, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        if (!res.ok) {
          const contentType = res.headers.get('content-type') || '';
          const body = contentType.includes('application/json') ? await res.json() : { message: await res.text() };
          throw new Error(body?.message || `Upload failed (${res.status})`);
        }
      }

      await loadAll({ q: '', sort: sortOrder });
    } catch (err) {
      setError(err?.message || 'Failed to upload documents.');
    } finally {
      setBusyUpload(false);
    }
  };

  const handleFileChange = (event) => {
    handleFiles(event.target.files);
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const requestTypeOptions = useMemo(
    () => ['Transcript', 'Certificate of Employment', 'Certificate of Completion', 'Recommendation Letter', 'Other'],
    []
  );

  const handleSubmitRequest = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to request documents.');
      return;
    }

    if (!requestForm.requestType) {
      setError('Please select a document type.');
      return;
    }

    setBusyRequest(true);
    setError('');
    try {
      const res = await fetch(apiEndpoints.documentRequests, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestType: requestForm.requestType,
          notes: requestForm.notes,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      const body = contentType.includes('application/json') ? await res.json() : { message: await res.text() };
      if (!res.ok) throw new Error(body?.message || `Request failed (${res.status})`);

      setShowRequestModal(false);
      setRequestForm({ requestType: 'Transcript', notes: '' });
      await loadAll();
    } catch (err) {
      setError(err?.message || 'Failed to request document.');
    } finally {
      setBusyRequest(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(apiEndpoints.downloadDocument(doc.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await res.json() : { message: await res.text() };
        throw new Error(body?.message || `Download failed (${res.status})`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('content-disposition') || '';
      const match = /filename="([^"]+)"/i.exec(contentDisposition);
      const filename = match?.[1] || doc.name || 'document';

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err?.message || 'Failed to download document.');
    }
  };

  const closeDocumentPreview = () => {
    setShowDocumentPreviewModal(false);
    setPreviewDocument((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const handleOpenDocument = async (doc) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(apiEndpoints.downloadDocument(doc.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await res.json() : { message: await res.text() };
        throw new Error(body?.message || `Open failed (${res.status})`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('content-disposition') || '';
      const match = /filename="([^"]+)"/i.exec(contentDisposition);
      const filename = match?.[1] || doc.name || 'document';
      const mimeType = (res.headers.get('content-type') || blob.type || 'application/octet-stream').toLowerCase();
      const kind = getPreviewKind(mimeType, filename);
      const textContent = kind === 'text' ? await blob.text() : '';

      setPreviewDocument((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return {
          id: doc.id,
          name: filename,
          url: URL.createObjectURL(blob),
          mimeType,
          kind,
          textContent,
          size: formatFileSize(blob.size),
        };
      });
      setShowDocumentPreviewModal(true);
    } catch (err) {
      setError(err?.message || 'Failed to open document.');
    }
  };

  const loadAdminRequests = async (opts = {}) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const status = typeof opts.status === 'string' ? opts.status : adminStatusFilter;
    try {
      const res = await fetch(`${apiEndpoints.adminDocumentRequests}?status=${encodeURIComponent(status)}&limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contentType = res.headers.get('content-type') || '';
      const body = contentType.includes('application/json') ? await res.json() : { message: await res.text() };
      if (!res.ok) throw new Error(body?.message || `Failed to load admin requests (${res.status})`);
      setAdminRequests(Array.isArray(body?.requests) ? body.requests : []);
    } catch (err) {
      setError(err?.message || 'Failed to load admin requests.');
    }
  };

  const openAdminRequests = async () => {
    setShowAdminRequestsModal(true);
    setAdminRequestsPage(1);
    await loadAdminRequests({ status: adminStatusFilter });
  };

  const handleAdminPickUpload = (requestId) => {
    setAdminUploadRequestId(String(requestId || ''));
    adminUploadInputRef.current?.click();
  };

  const handleAdminUploadSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !adminUploadRequestId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    setBusyAdminAction(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(apiEndpoints.fulfillDocumentRequest(adminUploadRequestId), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const contentType = res.headers.get('content-type') || '';
      const body = contentType.includes('application/json') ? await res.json() : { message: await res.text() };
      if (!res.ok) throw new Error(body?.message || `Failed to fulfill (${res.status})`);

      setAdminUploadRequestId('');
      await loadAdminRequests();
    } catch (err) {
      setError(err?.message || 'Failed to upload fulfillment document.');
    } finally {
      setBusyAdminAction(false);
    }
  };

  const openAdminRejectModal = (requestId) => {
    setAdminRejectRequestId(String(requestId || ''));
    setAdminRejectReason('');
    setShowAdminRejectModal(true);
  };

  const closeAdminRejectModal = () => {
    if (busyAdminAction) return;
    setShowAdminRejectModal(false);
    setAdminRejectRequestId('');
    setAdminRejectReason('');
  };

  const closeAdminRequestsModal = () => {
    if (busyAdminAction) return;
    setShowAdminRequestsModal(false);
    setShowAdminRejectModal(false);
    setAdminRejectRequestId('');
    setAdminRejectReason('');
  };

  const handleAdminReject = async (requestId, reason = '') => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setBusyAdminAction(true);
    setError('');
    try {
      const res = await fetch(apiEndpoints.rejectDocumentRequest(requestId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const contentType = res.headers.get('content-type') || '';
      const body = contentType.includes('application/json') ? await res.json() : { message: await res.text() };
      if (!res.ok) throw new Error(body?.message || `Failed to reject (${res.status})`);

      closeAdminRejectModal();
      await loadAdminRequests();
    } catch (err) {
      setError(err?.message || 'Failed to reject request.');
    } finally {
      setBusyAdminAction(false);
    }
  };

  return (
    <motion.div
      style={{ display: 'flex', minHeight: '100vh', background: '#faf8f3' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />
      <style>{`
        .doc-slide {
          transition: box-shadow 0.18s ease, filter 0.18s ease;
        }
        .doc-slide:hover {
          box-shadow: 0 10px 18px rgba(15, 23, 42, 0.10);
          filter: saturate(1.02);
        }
        .doc-slide:active {
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.10);
        }
        .doc-slide:disabled {
          opacity: 0.7;
          cursor: not-allowed !important;
          box-shadow: none !important;
          filter: none !important;
        }
      `}</style>

      <div style={{ flex: 1, padding: '28px 32px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: '0 0 6px 0' }}>
              Documents & <span style={{ color: '#e0b245' }}>Records</span>
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Access and manage your documents, certificates, and requests.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: 'Total Documents', value: String(stats.totalDocuments) },
              { label: 'Certifications', value: String(stats.certifications) },
              { label: 'Requested Documents', value: String(stats.requestedDocuments) },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  background: 'white',
                  border: '1px solid #efe4d3',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#f8ead0' }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>{card.label}</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>{card.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '18px', marginBottom: '20px' }}>
            <div
              style={{
                background: 'white',
                border: '1px solid #efe4d3',
                borderRadius: '16px',
                padding: '20px',
              }}
            >
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                style={{
                  border: `2px dashed ${isDragging ? '#d1991f' : '#e0b245'}`,
                  borderRadius: '14px',
                  padding: '40px',
                  textAlign: 'center',
                  color: '#6b7280',
                  cursor: 'pointer',
                  background: isDragging ? '#fff7e6' : 'transparent',
                  transition: 'background 0.2s ease, border-color 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                }}
              >
                <UploadSimple size={24} color="#9ca3af" />
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                  {busyUpload ? 'Uploading...' : 'Click to upload or drag and drop'}
                </div>
                <div style={{ fontSize: '12px' }}>PDF, JPG, PNG, DOC up to 15MB</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: 'white',
                  border: '1px solid #efe4d3',
                  borderRadius: '16px',
                  padding: '18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Document Request</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Track your requests</div>
                  </div>
                  <div />
                </div>

                <button
                  type="button"
                  onClick={() => setShowRequestModal(true)}
                  className="doc-slide doc-slide--dark"
                  style={{
                    width: '100%',
                    background: '#f4b000',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    color: '#111827',
                  }}
                >
                  <span className="doc-slide__label">Request a Document</span>
                </button>

                {isAdmin ? (
                  <button
                    type="button"
                    onClick={openAdminRequests}
                    className="doc-slide doc-slide--light"
                    style={{
                      width: '100%',
                      marginTop: 8,
                      background: '#fff',
                      border: '1px solid #efe4d3',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      color: '#111827',
                    }}
                  >
                    <span className="doc-slide__label">Admin: Manage Requests</span>
                  </button>
                ) : null}

                <div
                  style={{
                    marginTop: '12px',
                    border: '1px dashed #f0e7db',
                    borderRadius: '12px',
                    padding: '18px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '12px',
                  }}
                >
                  {requests.length === 0 ? (
                    'No document requests yet.'
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
                      {requests.slice(0, 1).map((r) => (
                        <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>{r.requestType}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>{formatRelativeTime(r.createdAt)}</div>
                            {r.status === 'fulfilled' && r.fulfilledDocument?.originalName ? (
                              <div style={{ marginTop: 6 }}>
                                <button
                                  type="button"
                                  onClick={() => handleDownload({
                                    id: r.fulfilledDocument._id,
                                    name: r.fulfilledDocument.originalName,
                                  })}
                                  className="doc-slide doc-slide--light"
                                  style={{
                                    background: '#fff',
                                    border: '1px solid #efe4d3',
                                    borderRadius: 8,
                                    padding: '4px 8px',
                                    fontSize: 10,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <span className="doc-slide__label">Download File</span>
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 900, color: r.status === 'fulfilled' ? '#16a34a' : r.status === 'rejected' ? '#b91c1c' : '#6b7280' }}>
                            {String(r.status || 'pending').toUpperCase()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'white',
              border: '1px solid #efe4d3',
              borderRadius: '16px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Documents</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Quick access to your latest files</div>
              </div>
              <div />
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <MagnifyingGlass size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') loadAll({ q: e.currentTarget.value }); }}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 34px',
                    borderRadius: '10px',
                    border: '1px solid #efe4d3',
                    fontSize: '12px',
                  }}
                />
              </div>
              <select
                value={sortOrder}
                onChange={(e) => { setSortOrder(e.target.value); loadAll({ sort: e.target.value }); }}
                style={{
                  border: '1px solid #efe4d3',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  fontSize: '12px',
                  color: '#6b7280',
                  background: 'white',
                }}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loading ? (
                <div style={{ border: '1px dashed #f0e7db', borderRadius: '12px', padding: '18px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                  Loading...
                </div>
              ) : documentItems.length === 0 ? (
                <div
                  style={{
                    border: '1px dashed #f0e7db',
                    borderRadius: '12px',
                    padding: '18px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '12px',
                  }}
                >
                  No documents uploaded yet.
                </div>
              ) : (
                documentItems.map((doc) => (
                  <div
                    key={doc.id || doc.name}
                    style={{
                      border: '1px solid #f0e7db',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={18} color="#6b7280" />
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#111827' }}>{doc.name}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{doc.size} • {doc.time}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>{doc.type}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenDocument(doc)}
                        className="doc-slide doc-slide--light"
                        style={{
                          background: '#fff8e6',
                          border: '1px solid #f4d38a',
                          borderRadius: '10px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          color: '#7c5a00',
                        }}
                      >
                        <span className="doc-slide__label">Open</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        className="doc-slide doc-slide--light"
                        style={{
                          background: 'white',
                          border: '1px solid #efe4d3',
                          borderRadius: '10px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        <span className="doc-slide__label">Download</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div style={{ position: 'fixed', bottom: 18, left: 120, right: 18, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 12px', borderRadius: 12, fontSize: 12, fontWeight: 800, maxWidth: 760, zIndex: 90 }}>
          {error}
        </div>
      ) : null}

      <AnimatePresence>
        {showDocumentPreviewModal && previewDocument ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              zIndex: 85,
            }}
            onClick={closeDocumentPreview}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 920,
                maxHeight: '86vh',
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #e5e7eb',
                padding: 14,
                boxShadow: '0 24px 60px rgba(15,23,42,0.28)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>{previewDocument.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{previewDocument.size}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleDownload({ id: previewDocument.id, name: previewDocument.name })}
                    className="doc-slide doc-slide--light"
                    style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <span className="doc-slide__label">Download</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeDocumentPreview}
                    className="doc-slide doc-slide--light"
                    style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <span className="doc-slide__label">Close</span>
                  </button>
                </div>
              </div>

              <div style={{ border: '1px solid #f0e7db', borderRadius: 12, padding: 10, overflow: 'auto', minHeight: 260 }}>
                {previewDocument.kind === 'image' ? (
                  <img
                    src={previewDocument.url}
                    alt={previewDocument.name}
                    style={{ width: '100%', maxHeight: '68vh', objectFit: 'contain', borderRadius: 10 }}
                  />
                ) : previewDocument.kind === 'pdf' ? (
                  <iframe
                    title={previewDocument.name}
                    src={previewDocument.url}
                    style={{ width: '100%', height: '68vh', border: 'none', borderRadius: 8 }}
                  />
                ) : previewDocument.kind === 'text' ? (
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, color: '#1f2937', maxHeight: '68vh', overflow: 'auto' }}>
                    {previewDocument.textContent || '(Empty file)'}
                  </pre>
                ) : (
                  <div style={{ padding: 22, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                    Preview is not available for this file type. Use Download to view it.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showRequestModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              zIndex: 80,
            }}
            onClick={() => { if (!busyRequest) setShowRequestModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 520,
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #e5e7eb',
                padding: 16,
                boxShadow: '0 24px 60px rgba(15,23,42,0.28)',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 900, color: '#111827' }}>Request a Document</div>
              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 6 }}>Type</div>
                  <select
                    value={requestForm.requestType}
                    onChange={(e) => setRequestForm((p) => ({ ...p, requestType: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 12, background: '#fff' }}
                  >
                    {requestTypeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 6 }}>Notes (optional)</div>
                  <textarea
                    value={requestForm.notes}
                    onChange={(e) => setRequestForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={4}
                    style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, fontSize: 12, resize: 'vertical', background: '#fff' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  disabled={busyRequest}
                  onClick={() => setShowRequestModal(false)}
                  className="doc-slide doc-slide--light"
                  style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  <span className="doc-slide__label">Cancel</span>
                </button>
                <button
                  type="button"
                  disabled={busyRequest}
                  onClick={handleSubmitRequest}
                  className="doc-slide doc-slide--dark"
                  style={{ background: '#f4b000', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#111827', cursor: 'pointer' }}
                >
                  <span className="doc-slide__label">{busyRequest ? 'Submitting...' : 'Submit Request'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <input ref={adminUploadInputRef} type="file" onChange={handleAdminUploadSelected} style={{ display: 'none' }} />

      <AnimatePresence>
        {showAdminRequestsModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              zIndex: 90,
            }}
            onClick={closeAdminRequestsModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 860,
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #e5e7eb',
                padding: 16,
                boxShadow: '0 24px 60px rgba(15,23,42,0.28)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#111827' }}>Admin: Document Requests</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <select
                    value={adminStatusFilter}
                    onChange={async (e) => {
                      setAdminStatusFilter(e.target.value);
                      setAdminRequestsPage(1);
                      await loadAdminRequests({ status: e.target.value });
                    }}
                    style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 600, background: '#fff' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button
                    type="button"
                    disabled={busyAdminAction}
                    onClick={closeAdminRequestsModal}
                    className="doc-slide doc-slide--light"
                    style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <span className="doc-slide__label">Close</span>
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ border: '1px solid #f0e7db', borderRadius: 14, padding: 12, maxHeight: 420, overflow: 'auto' }}>
                  {adminRequests.length === 0 ? (
                    <div style={{ padding: 18, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                      No requests found.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {paginatedAdminRequests.map((r) => (
                        <div key={r._id} style={{ border: '1px solid #f3f4f6', borderRadius: 12, padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 900, color: '#111827' }}>{r.requestType}</div>
                              <div style={{ fontSize: 11, color: '#6b7280' }}>
                                {r.requester?.name || r.requester?.email || 'Unknown requester'} · {formatRelativeTime(r.createdAt)}
                              </div>
                              {r.notes ? (
                                <div style={{ fontSize: 11, color: '#374151', marginTop: 6, whiteSpace: 'pre-wrap' }}>{r.notes}</div>
                              ) : null}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 900, color: r.status === 'fulfilled' ? '#16a34a' : r.status === 'rejected' ? '#b91c1c' : '#6b7280' }}>
                              {String(r.status || 'pending').toUpperCase()}
                            </div>
                          </div>

                          {r.status === 'pending' ? (
                            <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                disabled={busyAdminAction}
                                onClick={() => handleAdminPickUpload(r._id)}
                                className="doc-slide doc-slide--dark"
                                style={{ background: '#f4b000', border: 'none', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#111827' }}
                              >
                                <span className="doc-slide__label">Upload Fulfillment</span>
                              </button>
                              <button
                                type="button"
                                disabled={busyAdminAction}
                                onClick={() => openAdminRejectModal(r._id)}
                                className="doc-slide doc-slide--danger"
                                style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#b91c1c' }}
                              >
                                <span className="doc-slide__label">Reject</span>
                              </button>
                            </div>
                          ) : null}

                          {r.status === 'rejected' && r.rejectionReason ? (
                            <div style={{ marginTop: 8, fontSize: 11, color: '#b91c1c' }}>Reason: {r.rejectionReason}</div>
                          ) : null}

                          {r.status === 'fulfilled' && r.fulfilledDocument?.originalName ? (
                            <div style={{ marginTop: 8, fontSize: 11, color: '#166534' }}>
                              Uploaded file: {r.fulfilledDocument.originalName}
                            </div>
                          ) : null}
                        </div>
                      ))}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          Page {adminRequestsPage} of {adminRequestsTotalPages}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            disabled={adminRequestsPage <= 1}
                            onClick={() => setAdminRequestsPage((prev) => Math.max(1, prev - 1))}
                            className="doc-slide doc-slide--light"
                            style={{
                              background: '#fff',
                              border: '1px solid #e5e7eb',
                              borderRadius: 10,
                              padding: '6px 10px',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: adminRequestsPage <= 1 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <span className="doc-slide__label">Previous</span>
                          </button>
                          <button
                            type="button"
                            disabled={adminRequestsPage >= adminRequestsTotalPages}
                            onClick={() => setAdminRequestsPage((prev) => Math.min(adminRequestsTotalPages, prev + 1))}
                            className="doc-slide doc-slide--light"
                            style={{
                              background: '#fff',
                              border: '1px solid #e5e7eb',
                              borderRadius: 10,
                              padding: '6px 10px',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: adminRequestsPage >= adminRequestsTotalPages ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <span className="doc-slide__label">Next</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {showAdminRejectModal ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(15,23,42,0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                      zIndex: 95,
                    }}
                    onClick={closeAdminRejectModal}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        maxWidth: 480,
                        background: '#fff',
                        borderRadius: 14,
                        border: '1px solid #e5e7eb',
                        padding: 14,
                        boxShadow: '0 20px 46px rgba(15,23,42,0.22)',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>Reject reason (optional)</div>
                      <textarea
                        value={adminRejectReason}
                        onChange={(e) => setAdminRejectReason(e.target.value)}
                        rows={5}
                        placeholder="Reason shown to the user (optional)"
                        style={{ marginTop: 10, width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, fontSize: 12, resize: 'vertical', background: '#fff' }}
                      />
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          type="button"
                          disabled={busyAdminAction}
                          onClick={closeAdminRejectModal}
                          className="doc-slide doc-slide--light"
                          style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          <span className="doc-slide__label">Cancel</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyAdminAction || !adminRejectRequestId}
                          onClick={() => handleAdminReject(adminRejectRequestId, adminRejectReason)}
                          className="doc-slide doc-slide--danger"
                          style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#b91c1c' }}
                        >
                          <span className="doc-slide__label">Confirm Reject</span>
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
