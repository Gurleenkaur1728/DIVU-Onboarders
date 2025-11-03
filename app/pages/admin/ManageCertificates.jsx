import { useState, useEffect } from "react";
import { supabase } from "../../../src/lib/supabaseClient";

export default function ManageCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .order('certificate_generated_at', { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error('Error loading certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCertificates = certificates.filter(cert =>
    cert.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.module_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Certificate Management</h1>
        <p className="text-gray-600">View and manage generated certificates</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by user name or module title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-emerald-600">{certificates.length}</div>
          <div className="text-gray-600">Total Certificates</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">
            {new Set(certificates.map(c => c.user_id)).size}
          </div>
          <div className="text-gray-600">Unique Users</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">
            {new Set(certificates.map(c => c.module_id)).size}
          </div>
          <div className="text-gray-600">Modules with Certificates</div>
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Module
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Certificate Generated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCertificates.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? 'No certificates found matching your search.' : 'No certificates generated yet.'}
                  </td>
                </tr>
              ) : (
                filteredCertificates.map((certificate) => (
                  <tr key={certificate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {certificate.user_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {certificate.user_id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{certificate.module_title}</div>
                      <div className="text-sm text-gray-500">
                        {certificate.module_id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(certificate.completion_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(certificate.certificate_generated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <a
                        href={`/certificate/${certificate.module_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-900"
                      >
                        View Certificate
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}