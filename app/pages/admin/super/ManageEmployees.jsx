import { useEffect, useState } from "react";
import { supabase } from "../../../../src/lib/supabaseClient.js";
import { useToast } from "../../../context/ToastContext.jsx";
import AppLayout from "../../../../src/AppLayout.jsx";

export default function ManageEmployment() {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployees, setEditingEmployees] = useState({}); // Changed to object to track multiple edits
  const [formData, setFormData] = useState({}); // Changed to object to store data for each employee
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);


  useEffect(() => {
    loadEmployees();
  }, []);

  // Filter employees based on search and filters
  useEffect(() => {
    let filtered = employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (emp.employee_id && emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesDepartment = !departmentFilter || emp.department === departmentFilter;
      
      const matchesStatus = !statusFilter || 
        (statusFilter === 'complete' && emp.department && emp.position && emp.manager) ||
        (statusFilter === 'incomplete' && (!emp.department || !emp.position || !emp.manager)) ||
        (statusFilter === 'no-salary' && !emp.salary);
      
      return matchesSearch && matchesDepartment && matchesStatus;
    });
    
    setFilteredEmployees(filtered);
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, employee_id, hire_date, department, position, manager, employment_type, salary")
        .order("name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      showToast("Failed to load employees", "error");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (employee) => {
    setEditingEmployees(prev => ({
      ...prev,
      [employee.id]: true
    }));
    setFormData(prev => ({
      ...prev,
      [employee.id]: {
        employee_id: employee.employee_id || '',
        hire_date: employee.hire_date || '',
        department: employee.department || '',
        position: employee.position || '',
        manager: employee.manager || '',
        employment_type: employee.employment_type || '',
        salary: employee.salary || ''
      }
    }));
  };

  const cancelEditing = (employeeId) => {
    setEditingEmployees(prev => {
      const newState = { ...prev };
      delete newState[employeeId];
      return newState;
    });
    setFormData(prev => {
      const newState = { ...prev };
      delete newState[employeeId];
      return newState;
    });
  };

  const updateFormData = (employeeId, field, value) => {
    setFormData(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value
      }
    }));
  };

  const executeWithConfirmation = (action, message) => {
    setPendingAction({ action, message });
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    if (pendingAction) {
      pendingAction.action();
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  // Auto-save function
  const autoSave = async (employeeId) => {
    if (autoSaveEnabled && formData[employeeId]) {
      try {
        await saveEmployment(employeeId);
        showToast("Auto-saved successfully", "success");
      } catch (error) {
        showToast("Auto-save failed", "error");
      }
    }
  };

  // Enhanced updateFormData with auto-save
  const updateFormDataWithAutoSave = (employeeId, field, value) => {
    updateFormData(employeeId, field, value);
    
    // Debounced auto-save (save 2 seconds after last change)
    clearTimeout(window.autoSaveTimeout);
    window.autoSaveTimeout = setTimeout(() => {
      autoSave(employeeId);
    }, 2000);
  };

  // Bulk operations with confirmation
  const bulkEditAll = () => {
    executeWithConfirmation(
      () => {
        filteredEmployees.forEach(emp => {
          if (!editingEmployees[emp.id]) {
            startEditing(emp);
          }
        });
      },
      `Are you sure you want to edit all ${filteredEmployees.length} employees?`
    );
  };

  const bulkSaveAll = () => {
    executeWithConfirmation(
      async () => {
        for (const empId of Object.keys(editingEmployees)) {
          await saveEmployment(empId);
        }
      },
      `Save changes for ${Object.keys(editingEmployees).length} employees?`
    );
  };

  const bulkCancelAll = () => {
    executeWithConfirmation(
      () => {
        Object.keys(editingEmployees).forEach(empId => {
          cancelEditing(empId);
        });
      },
      `Cancel changes for ${Object.keys(editingEmployees).length} employees?`
    );
  };

  const saveEmployment = async (employeeId) => {
    try {
      const employeeFormData = formData[employeeId];
      const updateData = {
        employee_id: employeeFormData.employee_id || null,
        hire_date: employeeFormData.hire_date || null,
        department: employeeFormData.department || null,
        position: employeeFormData.position || null,
        manager: employeeFormData.manager || null,
        employment_type: employeeFormData.employment_type || null,
        salary: employeeFormData.salary ? parseFloat(employeeFormData.salary) : null
      };

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", employeeId);

      if (error) throw error;

      showToast("Employment details updated successfully!", "success");
      cancelEditing(employeeId);
      loadEmployees();
    } catch (error) {
      showToast("Failed to update employment details", "error");
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="bg-white min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading employees...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (

    <AppLayout>
      <div className="bg-gradient-to-br from-gray-50 via-white to-emerald-50 min-h-screen p-8">
        {/* Modern Header */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl opacity-10"></div>
          <div className="relative p-6 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg border border-emerald-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-emerald-950 mb-2">
                  Manage Employment Details
                </h1>
                <p className="text-gray-600">
                  Assign and manage employment information for all users
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={bulkEditAll}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={filteredEmployees.length === 0}
                >
                  Edit All ({filteredEmployees.length})
                </button>
                
                <button
                  onClick={bulkCancelAll}
                  className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-200 shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={Object.keys(editingEmployees).length === 0}
                >
                  Cancel All
                </button>

                <button
                  onClick={bulkSaveAll}
                  className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={Object.keys(editingEmployees).length === 0}
                >
                  Save All ({Object.keys(editingEmployees).length})
                </button>

                <button
                  onClick={loadEmployees}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white border-2 border-gray-100 rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Search Employees</label>
              <input
                type="text"
                placeholder="Search by name, email, or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200"
              />
            </div>
            
            {/* Department Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200"
              >
                <option value="">All Departments</option>
                <option value="Technology">Technology</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200"
              >
                <option value="">All Employees</option>
                <option value="complete">Complete Profiles</option>
                <option value="incomplete">Missing Info</option>
                <option value="no-salary">No Salary Set</option>
              </select>
            </div>
          </div>
          
          {/* Filter Results */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Showing {filteredEmployees.length} of {employees.length} employees
              {(searchTerm || departmentFilter || statusFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDepartmentFilter('');
                    setStatusFilter('');
                  }}
                  className="ml-2 text-emerald-600 hover:text-emerald-800 underline"
                >
                  Clear filters
                </button>
              )}
            </span>
            
            {/* Auto-save toggle */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-gray-700">Auto-save changes</span>
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium opacity-90 uppercase tracking-wide">Total Employees</h3>
                <p className="text-3xl font-bold mt-2">{filteredEmployees.length}</p>
                <p className="text-sm opacity-80 mt-1">({employees.length} total)</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium opacity-90 uppercase tracking-wide">Complete Profiles</h3>
                <p className="text-3xl font-bold mt-2">
                  {filteredEmployees.filter(emp => emp.department && emp.position && emp.manager).length}
                </p>
                <p className="text-sm opacity-80 mt-1">
                  {filteredEmployees.length > 0 ? 
                    Math.round((filteredEmployees.filter(emp => emp.department && emp.position && emp.manager).length / filteredEmployees.length) * 100) : 0
                  }% complete
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium opacity-90 uppercase tracking-wide">Missing Info</h3>
                <p className="text-3xl font-bold mt-2">
                  {filteredEmployees.filter(emp => !emp.department || !emp.position || !emp.manager).length}
                </p>
                <p className="text-sm opacity-80 mt-1">Need attention</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium opacity-90 uppercase tracking-wide">Currently Editing</h3>
                <p className="text-3xl font-bold mt-2">{Object.keys(editingEmployees).length}</p>
                <p className="text-sm opacity-80 mt-1">
                  {autoSaveEnabled ? "Auto-save ON" : "Manual save"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-100 rounded-2xl shadow-xl overflow-hidden">
          {Object.keys(editingEmployees).length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <span className="text-blue-900 font-semibold text-lg">
                  Currently editing {Object.keys(editingEmployees).length} employee(s)
                </span>
                <span className="text-blue-700 text-sm font-medium">
                  Make your changes and click "Save" for each employee or "Save All"
                </span>
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-700">Employee</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Employee ID</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Hire Date</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Department</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Position</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Manager</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Type</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Salary</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                    editingEmployees[employee.id] ? 'bg-blue-50 border-blue-200' : ''
                  }`}>
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </div>
                    </td>
                    
                    {editingEmployees[employee.id] ? (
                      <>
                        <td className="p-4">
                          <input
                            type="text"
                            value={formData[employee.id]?.employee_id || ''}
                            onChange={(e) => autoSaveEnabled ? 
                              updateFormDataWithAutoSave(employee.id, 'employee_id', e.target.value) :
                              updateFormData(employee.id, 'employee_id', e.target.value)
                            }
                            placeholder="Employee ID"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="p-4">
                          <input
                            type="date"
                            value={formData[employee.id]?.hire_date || ''}
                            onChange={(e) => autoSaveEnabled ? 
                              updateFormDataWithAutoSave(employee.id, 'hire_date', e.target.value) :
                              updateFormData(employee.id, 'hire_date', e.target.value)
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-4">
                          <select
                            value={formData[employee.id]?.department || ''}
                            onChange={(e) => autoSaveEnabled ? 
                              updateFormDataWithAutoSave(employee.id, 'department', e.target.value) :
                              updateFormData(employee.id, 'department', e.target.value)
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">Select...</option>
                            <option value="Technology">Technology</option>
                            <option value="Human Resources">Human Resources</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Sales">Sales</option>
                            <option value="Finance">Finance</option>
                            <option value="Operations">Operations</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <input
                            type="text"
                            value={formData[employee.id]?.position || ''}
                            onChange={(e) => autoSaveEnabled ? 
                              updateFormDataWithAutoSave(employee.id, 'position', e.target.value) :
                              updateFormData(employee.id, 'position', e.target.value)
                            }
                            placeholder="Job Title"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-4">
                          <input
                            type="text"
                            value={formData[employee.id]?.manager || ''}
                            onChange={(e) => autoSaveEnabled ? 
                              updateFormDataWithAutoSave(employee.id, 'manager', e.target.value) :
                              updateFormData(employee.id, 'manager', e.target.value)
                            }
                            placeholder="Manager Name"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-4">
                          <select
                            value={formData[employee.id]?.employment_type || ''}
                            onChange={(e) => autoSaveEnabled ? 
                              updateFormDataWithAutoSave(employee.id, 'employment_type', e.target.value) :
                              updateFormData(employee.id, 'employment_type', e.target.value)
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">Select...</option>
                            <option value="Full-Time">Full-Time</option>
                            <option value="Part-Time">Part-Time</option>
                            <option value="Contract">Contract</option>
                            <option value="Intern">Intern</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <input
                            type="number"
                            value={formData[employee.id]?.salary || ''}
                            onChange={(e) => autoSaveEnabled ? 
                              updateFormDataWithAutoSave(employee.id, 'salary', e.target.value) :
                              updateFormData(employee.id, 'salary', e.target.value)
                            }
                            placeholder="Annual Salary"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500"
                            min="0"
                            step="1000"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEmployment(employee.id)}
                              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => cancelEditing(employee.id)}
                              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 text-sm">
                          {employee.employee_id || <span className="text-red-500">Not assigned</span>}
                        </td>
                        <td className="p-4 text-sm">
                          {employee.hire_date 
                            ? new Date(employee.hire_date).toLocaleDateString()
                            : <span className="text-red-500">Not set</span>
                          }
                        </td>
                        <td className="p-4 text-sm">
                          {employee.department || <span className="text-red-500">Not assigned</span>}
                        </td>
                        <td className="p-4 text-sm">
                          {employee.position || <span className="text-red-500">Not assigned</span>}
                        </td>
                        <td className="p-4 text-sm">
                          {employee.manager || <span className="text-red-500">Not assigned</span>}
                        </td>
                        <td className="p-4 text-sm">
                          {employee.employment_type || <span className="text-red-500">Not set</span>}
                        </td>
                        <td className="p-4 text-sm">
                          {employee.salary 
                            ? `$${employee.salary.toLocaleString()}/year`
                            : <span className="text-orange-500">Not specified</span>
                          }
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => startEditing(employee)}
                            className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
                          >
                            Edit
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {employees.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No employees found</p>
          </div>
        )}
        
        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
                  <svg className="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Confirm Action</h3>
                <p className="text-gray-600 mb-6">{pendingAction?.message}</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}