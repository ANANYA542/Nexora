import { useState } from 'react';
import { Upload, X, Check, AlertTriangle, FileText } from 'lucide-react';
import client from '../../api/client';

export default function ImportStatementModal({ onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [step, setStep] = useState(1); // 1: Upload, 2: Review
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('statement', file);

    try {
      const res = await client.post('/transactions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        setParsedTransactions(res.data.data);
        setStep(2);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to parse statement.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    try {
      // Filter out exact duplicates that we flagged
      const validTxs = parsedTransactions.filter(tx => tx.status !== 'duplicate');
      
      // Perform bulk insert. Since we don't have a bulk endpoint, we do it in parallel or sequential.
      // A sequential approach is safer for the database connection pool.
      for (const tx of validTxs) {
        // We ensure we have category_id from the AI map
        if (tx.category_id) {
          await client.post('/transactions', {
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            category_id: tx.category_id,
            date: tx.date
          });
        }
      }

      alert(`Successfully imported ${validTxs.length} transactions!`);
      onImportSuccess();
    } catch (err) {
      console.error(err);
      alert('An error occurred during import. Some transactions may not have been saved.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{ width: step === 1 ? '500px' : '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.2s ease' }}>
        <div className="card-body" style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 className="heading-3">Import Bank Statement</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={20} />
            </button>
          </div>

          {step === 1 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ 
                border: '2px dashed var(--card-border)', borderRadius: '12px', padding: '40px',
                background: 'var(--bg-secondary)', marginBottom: 20
              }}>
                <FileText size={48} style={{ color: 'var(--text-secondary)', marginBottom: 16 }} />
                <h4 style={{ marginBottom: 8, fontWeight: 600 }}>Upload CSV or PDF</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                  Upload your bank statement and our AI will automatically categorize every transaction.
                </p>
                <input 
                  type="file" 
                  accept=".csv, .pdf" 
                  onChange={handleFileChange} 
                  id="statement-upload"
                  style={{ display: 'none' }} 
                />
                <button 
                  className="btn btn-secondary" 
                  onClick={() => document.getElementById('statement-upload').click()}
                >
                  Choose File
                </button>
                {file && <div style={{ marginTop: 16, fontSize: 14, fontWeight: 500, color: 'var(--accent-primary)' }}>Selected: {file.name}</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button 
                  className="btn btn-dark" 
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                >
                  {isUploading ? 'Parsing with AI...' : 'Parse Statement'}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>
                Please review the transactions before confirming. Duplicates have been automatically flagged.
              </p>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--card-border)', borderRadius: 8, marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--card-border)' }}>Date</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--card-border)' }}>Description</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--card-border)' }}>Amount</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--card-border)' }}>AI Category</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid var(--card-border)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTransactions.map((tx, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--card-border)', opacity: tx.status === 'duplicate' ? 0.5 : 1 }}>
                        <td style={{ padding: '12px' }}>{tx.date}</td>
                        <td style={{ padding: '12px' }}>{tx.description.substring(0, 40)}</td>
                        <td style={{ padding: '12px', color: tx.type === 'income' ? 'var(--accent-success)' : 'inherit' }}>
                          {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 4, fontSize: 12 }}>
                            {tx.category_name}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {tx.status === 'duplicate' ? (
                            <span style={{ color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <AlertTriangle size={14} /> Duplicate
                            </span>
                          ) : (
                            <span style={{ color: 'var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <Check size={14} /> Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  Ready to import: {parsedTransactions.filter(t => t.status !== 'duplicate').length}
                </span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={() => setStep(1)} disabled={isImporting}>Back</button>
                  <button className="btn btn-dark" onClick={handleConfirmImport} disabled={isImporting}>
                    {isImporting ? 'Importing...' : 'Confirm & Import'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
