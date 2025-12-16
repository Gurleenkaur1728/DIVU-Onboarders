import { useEffect, useState } from "react";
import { supabase } from "../../../../src/lib/supabaseClient.js";
import AppLayout from "../../../../src/AppLayout.jsx";


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
      <div className=" lex-1 min-h-dvh p-6 space-y-6">
        <div
          className="
            rounded-lg shadow-sm border px-6 py-4 mb-6 flex items-center justify-between transition
            bg-white border-gray-300 text-gray-900
            dark:bg-black/30 dark:border-black dark:text-white
          "
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Manage Employment Details
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Assign and manage employment information for all users
            </p>
          </div>

          <div className="flex gap-3">

            <button
              onClick={bulkEditAll}
              className="
                px-3 py-1.5 rounded-md text-xs md:text-sm font-medium border
                bg-transparent
               border-DivuDarkGreen
                hover:bg-DivuBlue hover:text-black transition-all
              "
            >
              Edit All ({filteredEmployees.length})
            </button>

            <button
              onClick={bulkCancelAll}
              className="
                px-3 py-1.5 rounded-md text-xs md:text-sm font-medium border
                bg-gray-700 text-white border-gray-900
                hover:bg-gray-500 transition-all
              "
            >
              Cancel All
            </button>

            <button
              onClick={bulkSaveAll}
              className="
                px-3 py-1.5 rounded-md text-xs md:text-sm font-medium border
                bg-DivuDarkGreen text-white border-black
                hover:bg-DivuBlue transition-all
              "
            >
              Save All ({Object.keys(editingEmployees).length})
            </button>

            <button
              onClick={loadEmployees}
              className="
                px-3 py-1.5 rounded-md text-xs md:text-sm font-medium border
                bg-transparent
                border-DivuDarkGreen
                hover:bg-DivuBlue hover:text-white transition-all
              "
            >
              Refresh
            </button>
          </div>
        </div>




        {/* Search and Filter Controls */}
        <div
          className="
            rounded-lg shadow-sm border p-4 mb-6 transition
            bg-white border-gray-300 
            dark:bg-black/30 dark:border-black 
          "
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Employees</label>
              <input
                type="text"
                placeholder="Search by name, email, or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-black"
              />
            </div>
            
            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-black"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                text-black"
                      
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
          <div
            className="
              grid grid-cols-1 md:grid-cols-4 gap-4 mb-6
              rounded-lg p-5 shadow-sm transition
             text-gray-900 dark:text-white
            "
          >


          <div className="text-white border rounded-lg p-4
            bg-gradient-to-r from-blue-500 to-blue-600
            dark:bg-DivuDarkGreen/70 dark:from-transparent dark:to-transparent dark:border-black">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Total Employees</h3>
                <p className="text-2xl font-bold">{filteredEmployees.length}</p>
                <p className="text-xs opacity-80">({employees.length} total)</p>
              </div>
            </div>
          </div>
          
          <div className="text-white border rounded-lg p-4
            bg-gradient-to-r from-green-500 to-green-600 
            dark:bg-DivuDarkGreen/70 dark:from-transparent dark:to-transparent dark:border-black">
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
            </div>
          </div>
          
          <div className="text-white border rounded-lg p-4
            bg-gradient-to-r from-orange-500 to-orange-600
            dark:bg-DivuDarkGreen/70 dark:from-transparent dark:to-transparent dark:border-black">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Missing Info</h3>
                <p className="text-2xl font-bold">
                  {filteredEmployees.filter(emp => !emp.department || !emp.position || !emp.manager).length}
                </p>
                <p className="text-xs opacity-80">Need attention</p>
              </div>
            </div>
          </div>

          <div className="text-white border rounded-lg p-4
            bg-gradient-to-r from-purple-500 to-purple-600
            dark:bg-DivuDarkGreen/70 dark:from-transparent dark:to-transparent dark:border-black">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Currently Editing</h3>
                <p className="text-2xl font-bold">{Object.keys(editingEmployees).length}</p>
                <p className="text-xs opacity-80">
                  {autoSaveEnabled ? "Auto-save ON" : "Manual save"}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div
          className="
            rounded-lg shadow-sm border overflow-hidden transition
            bg-white border-gray-300 text-gray-900
            dark:bg-black/40 dark:border-black dark:text-white
          "
        >
          {Object.keys(editingEmployees).length > 0 && (
            <div className="bg-DivuBlue/30 dark:bg-DivuDarkBlue/70 border-b border-blue-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-blue-800 font-medium dark:text-white
                ">
                  Currently editing {Object.keys(editingEmployees).length} employee(s)
                </span>
                <span className="text-blue-600 text-sm">
                  Make your changes and click "Save" for each employee or "Save All"
                </span>
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead
                className="
                  bg-gray-50 border-b border-gray-300 text-gray-700
                  dark:bg-black/60 dark:border-gray-700 dark:text-white 
                "
              >
                <tr
                  className="
                    border-b transition-colors
                   dark:hover:bg-black/30
                    border-gray-200 dark:border-gray-700
                  "
                >
                  <th className="text-left p-4 font-semibold">Employee</th>
                  <th className="text-left p-4 font-semibold">Employee ID</th>
                  <th className="text-left p-4 font-semibold">Hire Date</th>
                  <th className="text-left p-4 font-semibold">Department</th>
                  <th className="text-left p-4 font-semibold">Position</th>
                  <th className="text-left p-4 font-semibold">Manager</th>
                  <th className="text-left p-4 font-semibold">Type</th>
                  <th className="text-left p-4 font-semibold">Salary</th>
                  <th className="text-left p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className={`border-b border-gray-200 transition-colors hover:bg-DivuLightGreen/50
                    ${
                    editingEmployees[employee.id] ? 'bg-DivuBlue/80 border-DivuLightGreen/80 focus-visible:border-DivuLightGreen/80' : ''
                  }`}>
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-sm 
                        ">{employee.email}</div>
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
                            className="w-full px-2 py-1 border border-gray-500 rounded text-sm text-black"
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
                            className="w-full px-2 py-1 border border-gray-500 rounded text-sm focus:ring-2 focus:ring-emerald-500 text-black"
                          />
                        </td>
                        <td className="p-4">
                          <select
                            value={formData[employee.id]?.department || ''}
                            onChange={(e) => autoSaveEnabled ? 
                              updateFormDataWithAutoSave(employee.id, 'department', e.target.value) :
                              updateFormData(employee.id, 'department', e.target.value)
                            }
                            className="w-full px-2 py-1 border border-gray-500 rounded text-sm focus:ring-2 focus:ring-emerald-500 text-black"
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
                            className="w-full px-2 py-1 border border-gray-500 rounded text-sm focus:ring-2 focus:ring-emerald-500 text-black"
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
                            className="w-full px-2 py-1 border border-gray-500 rounded text-sm focus:ring-2 focus:ring-emerald-500 text-black"
                          />
                        </td>
                        <td className="p-4">
                          <select
                            value={formData[employee.id]?.employment_type || ''}
                            onChange={(e) => autoSaveEnabled ? 
                              updateFormDataWithAutoSave(employee.id, 'employment_type', e.target.value) :
                              updateFormData(employee.id, 'employment_type', e.target.value)
                            }
                            className="w-full px-2 py-1 border border-gray-500 rounded text-sm focus:ring-2 focus:ring-emerald-500 text-black"
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
                            className="w-full px-2 py-1 border border-gray-500 rounded text-sm focus:ring-2 focus:ring-emerald-500 text-black"
                            min="0"
                            step="1000"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEmployment(employee.id)}
                              className="px-3 py-1 bg-DivuDarkGreen
                               text-white rounded text-sm hover:bg-DivuLightGreen hover:text-black
                               border-black border  
                              "
                            >
                              Save
                            </button>
                            <button
                              onClick={() => cancelEditing(employee.id)}
                              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 border border-black"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 text-sm">
                          {employee.employee_id || <span className="text-red-900 font-bold">Not assigned</span>}
                        </td>
                        <td className="p-4 text-sm">
                          {employee.hire_date 
                            ? new Date(employee.hire_date).toLocaleDateString()
                            : <span className="text-red-900 font-bold">Not set</span>
                          }
                        </td>
                        <td className="p-4 text-sm">
                          {employee.department || <span className="text-red-800 font-bold">Not assigned</span>}
                        </td>
                        <td className="p-4 text-sm">
                          {employee.position || <span className="text-red-800 font-bold">Not assigned</span>}
                        </td>
                        <td className="p-4 text-sm">
                          {employee.manager || <span className="text-red-800 font-bold">Not assigned</span>}
                        </td>
                        <td className="p-4 text-sm">
                          {employee.employment_type || <span className="text-red-800 font-bold">Not set</span>}
                        </td>
                        <td className="p-4 text-sm">
                          {employee.salary 
                            ? `$${employee.salary.toLocaleString()}/year`
                            : <span className="text-orange-800 font-bold">Not specified</span>
                          }
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => startEditing(employee)}
                            className="px-3 py-1 bg-DivuDarkGreen text-white rounded text-sm hover:bg-DivuBlue border-black border"
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
      
    </AppLayout>
  );
}