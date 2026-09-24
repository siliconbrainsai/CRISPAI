import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { uploadTabular, uploadImages, createDataset, logAudit } from '../../services/api';
import { useWorkspace } from '../../context/WorkspaceContext';

const DataIngestion = ({ onDatasetUploaded }) => {
    const [tabularFile, setTabularFile] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const { setActiveDataset } = useWorkspace();

    const handleTabularUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setTabularFile(file);
        setUploadError(null);
        setUploadSuccess(false);
        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        try {
            // Step 1: Upload to parser pipeline
            const uploadRes = await uploadTabular(formData);
            setPreview(uploadRes.data);
            
            // Step 2: Persist in SQLite database
            const datasetPayload = {
                filename: uploadRes.data.filename,
                row_count: uploadRes.data.row_count || 100,
                schema_definition: uploadRes.data.columns || [],
                file_path: uploadRes.data.file_path || null
            };
            const dbRes = await createDataset(datasetPayload);
            
            // Step 3: Set active dataset in application state
            setActiveDataset(dbRes.data);
            setUploadSuccess(true);

            // Step 4: Notify parent list to refresh
            if (onDatasetUploaded) {
                onDatasetUploaded(dbRes.data);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            setUploadError(error.message || 'Failed to upload dataset to backend database.');
        } finally {
            setUploading(false);
        }
    };


    return (
        <div className="p-6 bg-slate-900 rounded-lg text-slate-100 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Data Ingestion</h2>
            
            {uploading && (
                <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg flex items-center gap-3 text-indigo-300 text-sm">
                    <Loader2 className="animate-spin text-indigo-400" size={18} />
                    <span>Uploading and persisting dataset to database...</span>
                </div>
            )}

            {uploadSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3 text-emerald-300 text-sm">
                    <CheckCircle2 className="text-emerald-400" size={18} />
                    <span>Dataset successfully saved to backend database!</span>
                </div>
            )}

            {uploadError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-3 text-rose-300 text-sm">
                    <AlertCircle className="text-rose-400" size={18} />
                    <span>{uploadError}</span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-slate-600 p-6 rounded text-center cursor-pointer hover:bg-slate-800 transition relative">
                    <input type="file" onChange={handleTabularUpload} accept=".csv,.xlsx" className="hidden" id="tabUpload" />
                    <label htmlFor="tabUpload" className="cursor-pointer flex flex-col items-center">
                        <UploadCloud size={40} className="mb-2 text-indigo-400" />
                        <span className="font-semibold">Upload Tabular Data (CSV/XLSX)</span>
                        {tabularFile && (
                            <span className="mt-3 bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full truncate max-w-full">
                                {tabularFile.name}
                            </span>
                        )}
                    </label>
                </div>

                <div className="border-2 border-dashed border-slate-600 p-6 rounded text-center cursor-pointer hover:bg-slate-800 transition relative">
                    <input type="file" onChange={(e) => setImageFile(e.target.files[0])} accept=".zip,.png,.jpg,.jpeg" className="hidden" id="imgUpload" />
                    <label htmlFor="imgUpload" className="cursor-pointer flex flex-col items-center">
                        <UploadCloud size={40} className="mb-2 text-indigo-400" />
                        <span className="font-semibold">Upload Image Data (.zip or images)</span>
                        {imageFile && (
                            <span className="mt-3 bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full truncate max-w-full">
                                {imageFile.name}
                            </span>
                        )}
                    </label>
                </div>
            </div>

            {preview && (
                <div className="mt-6 p-4 bg-slate-800 rounded">
                    <h3 className="font-semibold mb-2">Tabular Preview</h3>
                    <p className="text-sm text-slate-400">File: {preview.filename} ({preview.row_count} rows)</p>
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                        {preview.columns.map((col) => (
                            <span key={col} className="bg-slate-700 px-2 py-1 rounded text-xs">{col}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataIngestion;
