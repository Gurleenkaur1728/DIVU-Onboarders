import { useEffect, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient.js";
import Sidebar from "../../components/Sidebar.jsx";
import { useRole } from "../../../src/lib/hooks/useRole.js";

export default function ManageEmployment() {
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

  const { roleId } = useRole();

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
      console.error("Error loading employees:", error);
      alert("Failed to load employees");
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
        console.log(`Auto-saved data for employee ${employeeId}`);
      } catch (error) {
        console.error('Auto-save failed:', error);
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

      alert("✅ Employment details updated successfully!");
      cancelEditing(employeeId);
      loadEmployees();
    } catch (error) {
      console.error("Error updating employment:", error);
      alert("❌ Failed to update employment details");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-lg animate-pulse">Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-gradient-to-br from-emerald-50 to-green-100/60">
      <Sidebar role={roleId} />
      
      <div className="flex-1 p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-emerald-900 mb-2">
              👥 Manage Employment Details
            </h1>
            <p className="text-emerald-600">
              Assign and manage employment information for all users
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={bulkEditAll}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              disabled={filteredEmployees.length === 0}
            >
              📝 Edit All ({filteredEmployees.length})
            </button>
            
            <button
              onClick={bulkCancelAll}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              disabled={Object.keys(editingEmployees).length === 0}
            >
              ❌ Cancel All
            </button>

            <button
              onClick={bulkSaveAll}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              disabled={Object.keys(editingEmployees).length === 0}
            >
              ✅ Save All Changes ({Object.keys(editingEmployees).length})
            </button>

            <button
              onClick={loadEmployees}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">🔍 Search Employees</label>
              <input
                type="text"
                placeholder="Search by name, email, or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">🏢 Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">📊 Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
              <span className="text-gray-700">💾 Auto-save changes</span>
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Total Employees</h3>
                <p className="text-2xl font-bold">{filteredEmployees.length}</p>
                <p className="text-xs opacity-80">({employees.length} total)</p>
              </div>
              <div className="text-3xl opacity-80">👥</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Complete Profiles</h3>
                <p className="text-2xl font-bold">
                  {filteredEmployees.filter(emp => emp.department && emp.position && emp.manager).length}
                </p>
                <p className="text-xs opacity-80">
                  {filteredEmployees.length > 0 ? 
                    Math.round((filteredEmployees.filter(emp => emp.department && emp.position && emp.manager).length / filteredEmployees.length) * 100) : 0
                  }% complete
                </p>
              </div>
              <div className="text-3xl opacity-80">✅</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Missing Info</h3>
                <p className="text-2xl font-bold">
                  {filteredEmployees.filter(emp => !emp.department || !emp.position || !emp.manager).length}
                </p>
                <p className="text-xs opacity-80">Need attention</p>
              </div>
              <div className="text-3xl opacity-80">⚠️</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Currently Editing</h3>
                <p className="text-2xl font-bold">{Object.keys(editingEmployees).length}</p>
                <p className="text-xs opacity-80">
                  {autoSaveEnabled ? "Auto-save ON" : "Manual save"}
                </p>
              </div>
              <div className="text-3xl opacity-80">📝</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {Object.keys(editingEmployees).length > 0 && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-blue-800 font-medium">
                  📝 Currently editing {Object.keys(editingEmployees).length} employee(s)
                </span>
                <span className="text-blue-600 text-sm">
                  Make your changes and click "Save" for each employee or "Save All Changes"
                </span>
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-emerald-50 border-b border-emerald-200">
                <tr>
                  <th className="text-left p-4 font-semibold text-emerald-900">Employee</th>
                  <th className="text-left p-4 font-semibold text-emerald-900">Employee ID</th>
                  <th className="text-left p-4 font-semibold text-emerald-900">Hire Date</th>
                  <th className="text-left p-4 font-semibold text-emerald-900">Department</th>
                  <th className="text-left p-4 font-semibold text-emerald-900">Position</th>
                  <th className="text-left p-4 font-semibold text-emerald-900">Manager</th>
                  <th className="text-left p-4 font-semibold text-emerald-900">Type</th>
                  <th className="text-left p-4 font-semibold text-emerald-900">Salary</th>
                  <th className="text-left p-4 font-semibold text-emerald-900">Actions</th>
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
                            className="px-3 py-1 bg-emerald-500 text-white rounded text-sm hover:bg-emerald-600"
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
            <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Confirm Action</h3>
              <p className="text-gray-600 mb-6">{pendingAction?.message}</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}