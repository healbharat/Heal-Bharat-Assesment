import React, { useEffect, useState } from 'react';
import { AssessmentRecord } from '../types';
import { BackendService, BlockedUser } from '../services/backend';
import { LogOut, RefreshCw, Search, Download, ShieldAlert, Unlock } from 'lucide-react';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [view, setView] = useState<'RECORDS' | 'BLOCKED'>('RECORDS');
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 🔥 Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const fetchData = async () => {
    setLoading(true);
    const recs = await BackendService.getAllRecords();
    const blks = await BackendService.getBlockedUsers();
    setRecords(recs);
    setBlockedUsers(blks);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUnblock = async (email: string) => {
    if (confirm(`Are you sure you want to unblock ${email}?`)) {
      await BackendService.unblockUser(email);
      fetchData();
    }
  };

  // 🔍 Search Filters
  const filteredRecords = records.filter(
    (record) =>
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 📌 Pagination Calculations
  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);
  const indexOfLastRecord = currentPage * rowsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);

  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const goToPrevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // 📥 Export CSV
  const downloadCSV = () => {
    if (records.length === 0) return;

    const headers = [
      'Name',
      'Email',
      'Phone',
      'Aptitude',
      'Technical',
      'Communication',
      'Overall',
      'Date',
    ];

    const csvContent = [
      headers.join(','),
      ...records.map((r) =>
        [
          `"${r.name}"`,
          r.email,
          r.phone,
          r.aptitudeScore,
          r.technicalScore,
          r.communicationScore,
          r.overallScore,
          new Date(r.timestamp).toLocaleDateString(),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'tronex_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tronex Admin</h1>
            <p className="text-slate-500">Candidate Performance & Security</p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>

        {/* SMALL STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-slate-500 text-sm font-medium uppercase">Total Candidates</h3>
            <p className="text-3xl font-bold text-indigo-600 mt-2">{records.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-slate-500 text-sm font-medium uppercase">Blocked Users</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">{blockedUsers.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-slate-500 text-sm font-medium uppercase">Avg Overall Score</h3>
            <p className="text-3xl font-bold text-emerald-600 mt-2">
              {records.length > 0
                ? Math.round(records.reduce((acc, r) => acc + r.overallScore, 0) / records.length)
                : 0}
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex space-x-1 mb-6 bg-white p-1 rounded-xl w-fit border border-slate-200">
          <button
            onClick={() => setView('RECORDS')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              view === 'RECORDS' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Assessment Records
          </button>
          <button
            onClick={() => setView('BLOCKED')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              view === 'BLOCKED' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Blocked Candidates
          </button>
        </div>

        {/* RECORDS VIEW */}
        {view === 'RECORDS' && (
          <>
            {/* SEARCH + EXPORT */}
            <div className="bg-white p-4 rounded-t-xl border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button onClick={fetchData} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                  <RefreshCw className="w-5 h-5" />
                </button>

                <button
                  onClick={downloadCSV}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-b-xl shadow-sm border border-slate-200 overflow-hidden">
              
              {/* SCROLLABLE CONTENT */}
              <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
                      <th className="p-4 font-semibold">Candidate</th>
                      <th className="p-4 font-semibold">Contact</th>
                      <th className="p-4 font-semibold">Aptitude</th>
                      <th className="p-4 font-semibold">Tech</th>
                      <th className="p-4 font-semibold">Comm</th>
                      <th className="p-4 font-semibold">Overall</th>
                      <th className="p-4 font-semibold">Date</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          Loading data...
                        </td>
                      </tr>
                    ) : currentRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No records found.
                        </td>
                      </tr>
                    ) : (
                      currentRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-900">{record.name}</td>
                          <td className="p-4">
                            <div className="text-sm text-slate-700">{record.email}</div>
                            <div className="text-sm text-slate-500">{record.phone}</div>
                          </td>
                          <td className="p-4 text-blue-600 font-medium">{record.aptitudeScore}</td>
                          <td className="p-4 text-purple-600 font-medium">{record.technicalScore}</td>
                          <td className="p-4 text-indigo-600 font-medium">{record.communicationScore}</td>
                          <td
                            className={`p-4 font-bold text-lg ${
                              record.overallScore >= 80
                                ? 'text-green-600'
                                : record.overallScore >= 60
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          >
                            {record.overallScore}
                          </td>
                          <td className="p-4 text-sm text-slate-500">
                            {new Date(record.timestamp).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex justify-between items-center p-4 border-t bg-white">
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg border ${
                    currentPage === 1
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-white hover:bg-slate-100'
                  }`}
                >
                  Previous
                </button>

                <span className="text-slate-700 font-medium">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg border ${
                    currentPage === totalPages
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-white hover:bg-slate-100'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* BLOCKED USERS */}
        {view === 'BLOCKED' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-red-50 p-4 border-b border-red-100 flex items-center">
              <ShieldAlert className="w-5 h-5 text-red-600 mr-2" />
              <h2 className="text-red-800 font-bold">Security Block List</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
                    <th className="p-4 font-semibold">User Details</th>
                    <th className="p-4 font-semibold">Reason</th>
                    <th className="p-4 font-semibold">Blocked At</th>
                    <th className="p-4 font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {blockedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        No blocked users.
                      </td>
                    </tr>
                  ) : (
                    blockedUsers.map((user, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{user.name}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                          <div className="text-sm text-slate-500">{user.phone}</div>
                        </td>

                        <td className="p-4 text-red-700">{user.reason}</td>

                        <td className="p-4 text-sm text-slate-500">
                          {new Date(user.timestamp).toLocaleString()}
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => handleUnblock(user.email)}
                            className="px-3 py-1.5 border rounded-lg hover:bg-green-50 hover:border-green-300 text-slate-700 hover:text-green-700"
                          >
                            <Unlock className="w-4 h-4 inline-block mr-1" />
                            Unblock
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
