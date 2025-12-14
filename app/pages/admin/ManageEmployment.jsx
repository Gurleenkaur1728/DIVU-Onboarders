import { useEffect, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient.js";
import Sidebar from "../../components/Sidebar.jsx";
import { useRole } from "../../../src/lib/hooks/useRole.js";

export default function ManageEmployment() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployees, setEditingEmployees] = useState({});
  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);

  const { roleId } = useRole();

  useEffect(() => {
    loadEmployees();
  }, []);

  // Filter employees based on search and filters
  useEffect(() => {
    let filtered = employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.employee_id &&
          emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDepartment =
        !departmentFilter || emp.department === departmentFilter;

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "complete" &&
          emp.department &&
          emp.position &&
          emp.manager) ||
        (statusFilter === "incomplete" &&
          (!emp.department || !emp.position || !emp.manager)) ||
        (statusFilter === "no-salary" && !emp.salary);

      return matchesSearch && matchesDepartment && matchesStatus;
    });

    setFilteredEmployees(filtered);
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, name, email, employee_id, hire_date, department, position, manager, employment_type, salary"
        )
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
    setEditingEmployees((prev) => ({
      ...prev,
      [employee.id]: true,
    }));
    setFormData((prev) => ({
      ...prev,
      [employee.id]: {
        employee_id: employee.employee_id || "",
        hire_date: employee.hire_date || "",
        department: employee.department || "",
        position: employee.position || "",
        manager: employee.manager || "",
        employment_type: employee.employment_type || "",
        salary: employee.salary || "",
      },
    }));
  };

  const cancelEditing = (employeeId) => {
    setEditingEmployees((prev) => {
      const newState = { ...prev };
      delete newState[employeeId];
      return newState;
    });
    setFormData((prev) => {
      const newState = { ...prev };
      delete newState[employeeId];
      return newState;
    });
  };

  const updateFormData = (employeeId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value,
      },
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
        console.error("Auto-save failed:", error);
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
        filteredEmployees.forEach((emp) => {
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
        Object.keys(editingEmployees).forEach((empId) => {
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
        salary: employeeFormData.salary
          ? parseFloat(employeeFormData.salary)
          : null,
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
      <div className="flex min-h-dvh items-center justify-center bg-black/40">
        <p className="text-lg text-DivuWhite animate-pulse">
          Loading employees...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-black/40 text-slate-100">
      <Sidebar role={roleId} />

      <div className="flex-1 p-6">
        {/* Header bar (match AdminDashboard style) */}
        <div className="mb-6 flex justify-between items-center bg-black/30 border border-black px-6 py-4 rounded-lg">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-DivuWhite mb-1">
              👥 Manage Employment Details
            </h1>
            <p className="text-sm text-DivuLightGreen/80">
              Assign and manage employment information for all users
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:gap-3 justify-end">
            <button
              onClick={bulkEditAll}
              className="px-3 py-1.5 rounded-full text-xs md:text-sm font-medium border
                         bg-black text-white border-DivuDarkGreen 
                         hover:bg-DivuBlue hover:text-black transition-all flex items-center gap-2 disabled:opacity-50"
              disabled={filteredEmployees.length === 0}
            >
              📝 Edit All ({filteredEmployees.length})
            </button>

            <button
              onClick={bulkCancelAll}
              className="px-3 py-1.5 rounded-full text-xs md:text-sm font-medium border
                         bg-black/60 text-slate-100 border-gray-700
                         hover:bg-black hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
              disabled={Object.keys(editingEmployees).length === 0}
            >
              ❌ Cancel All
            </button>

            <button
              onClick={bulkSaveAll}
              className="px-3 py-1.5 rounded-full text-xs md:text-sm font-medium border
                         bg-DivuDarkGreen text-white border-DivuLightGreen
                         hover:bg-DivuBlue hover:text-black transition-all flex items-center gap-2 disabled:opacity-50"
              disabled={Object.keys(editingEmployees).length === 0}
            >
              ✅ Save All Changes ({Object.keys(editingEmployees).length})
            </button>

            <button
              onClick={loadEmployees}
              className="px-3 py-1.5 rounded-full text-xs md:text-sm font-medium border
                         bg-DivuBlue text-black border-DivuDarkGreen
                         hover:bg-DivuLightGreen transition-all flex items-center gap-2"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-black/60 rounded-xl shadow-sm border border-DivuDarkGreen p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-emerald-100 mb-1">
                🔍 Search Employees
              </label>
              <input
                type="text"
                placeholder="Search by name, email, or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-emerald-700 
                           bg-black/60 text-emerald-50 placeholder:text-emerald-300/60
                           focus:ring-2 focus:ring-DivuLightGreen focus:border-DivuLightGreen"
              />
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-emerald-100 mb-1">
                🏢 Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-emerald-700 
                           bg-black/60 text-emerald-50 focus:ring-2 focus:ring-DivuLightGreen focus:border-DivuLightGreen"
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
              <label className="block text-sm font-medium text-emerald-100 mb-1">
                📊 Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-emerald-700 
                           bg-black/60 text-emerald-50 focus:ring-2 focus:ring-DivuLightGreen focus:border-DivuLightGreen"
              >
                <option value="">All Employees</option>
                <option value="complete">Complete Profiles</option>
                <option value="incomplete">Missing Info</option>
                <option value="no-salary">No Salary Set</option>
              </select>
            </div>
          </div>

          {/* Filter Results */}
          <div className="mt-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <span className="text-sm text-emerald-100/80">
              Showing {filteredEmployees.length} of {employees.length} employees
              {(searchTerm || departmentFilter || statusFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setDepartmentFilter("");
                    setStatusFilter("");
                  }}
                  className="ml-2 text-DivuLightGreen hover:text-white underline"
                >
                  Clear filters
                </button>
              )}
            </span>

            {/* Auto-save toggle */}
            <label className="flex items-center gap-2 text-sm text-emerald-100">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="rounded border-emerald-400 text-DivuLightGreen focus:ring-DivuLightGreen bg-black/60"
              />
              <span>💾 Auto-save changes</span>
            </label>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-DivuDarkGreen/80 text-emerald-50 rounded-lg p-4 border border-black shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Total Employees</h3>
                <p className="text-2xl font-bold">{filteredEmployees.length}</p>
                <p className="text-xs opacity-80">({employees.length} total)</p>
              </div>
              <div className="text-3xl opacity-80">👥</div>
            </div>
          </div>

          <div className="bg-DivuDarkGreen/80 text-emerald-50 rounded-lg p-4 border border-black shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">
                  Complete Profiles
                </h3>
                <p className="text-2xl font-bold">
                  {
                    filteredEmployees.filter(
                      (emp) => emp.department && emp.position && emp.manager
                    ).length
                  }
                </p>
                <p className="text-xs opacity-80">
                  {filteredEmployees.length > 0
                    ? Math.round(
                        (filteredEmployees.filter(
                          (emp) =>
                            emp.department && emp.position && emp.manager
                        ).length /
                          filteredEmployees.length) *
                          100
                      )
                    : 0}
                  % complete
                </p>
              </div>
              <div className="text-3xl opacity-80">✅</div>
            </div>
          </div>

          <div className="bg-DivuDarkGreen/80 text-emerald-50 rounded-lg p-4 border border-black shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Missing Info</h3>
                <p className="text-2xl font-bold">
                  {
                    filteredEmployees.filter(
                      (emp) =>
                        !emp.department || !emp.position || !emp.manager
                    ).length
                  }
                </p>
                <p className="text-xs opacity-80">Need attention</p>
              </div>
              <div className="text-3xl opacity-80">⚠️</div>
            </div>
          </div>

          <div className="bg-DivuDarkGreen/80 text-emerald-50 rounded-lg p-4 border border-black shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">
                  Currently Editing
                </h3>
                <p className="text-2xl font-bold">
                  {Object.keys(editingEmployees).length}
                </p>
                <p className="text-xs opacity-80">
                  {autoSaveEnabled ? "Auto-save ON" : "Manual save"}
                </p>
              </div>
              <div className="text-3xl opacity-80">📝</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-black/60 rounded-xl shadow-lg overflow-hidden border border-DivuDarkGreen">
          {Object.keys(editingEmployees).length > 0 && (
            <div className="bg-black/60 border-b border-DivuDarkGreen px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-DivuLightGreen font-medium">
                  📝 Currently editing {Object.keys(editingEmployees).length}{" "}
                  employee(s)
                </span>
                <span className="text-emerald-100/80 text-sm">
                  Make your changes and click "Save" for each employee or "Save
                  All Changes"
                </span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/80 border-b border-DivuDarkGreen">
                <tr>
                  <th className="text-left p-4 font-semibold text-DivuLightGreen">
                    Employee
                  </th>
                  <th className="text-left p-4 font-semibold text-DivuLightGreen">
                    Employee ID
                  </th>
                  <th className="text-left p-4 font-semibold text-DivuLightGreen">
                    Hire Date
                  </th>
                  <th className="text-left p-4 font-semibold text-DivuLightGreen">
                    Department
                  </th>
                  <th className="text-left p-4 font-semibold text-DivuLightGreen">
                    Position
                  </th>
                  <th className="text-left p-4 font-semibold text-DivuLightGreen">
                    Manager
                  </th>
                  <th className="text-left p-4 font-semibold text-DivuLightGreen">
                    Type
                  </th>
                  <th className="text-left p-4 font-semibold text-DivuLightGreen">
                    Salary
                  </th>
                  <th className="text-left p-4 font-semibold text-DivuLightGreen">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className={`border-b border-emerald-900/40 hover:bg-black/70 transition-colors ${
                      editingEmployees[employee.id]
                        ? "bg-DivuBlue/10 border-DivuBlue/60"
                        : ""
                    }`}
                  >
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-emerald-50">
                          {employee.name}
                        </div>
                        <div className="text-sm text-emerald-200/80">
                          {employee.email}
                        </div>
                      </div>
                    </td>

                    {editingEmployees[employee.id] ? (
                      <>
                        <td className="p-4">
                          <input
                            type="text"
                            value={formData[employee.id]?.employee_id || ""}
                            onChange={(e) =>
                              autoSaveEnabled
                                ? updateFormDataWithAutoSave(
                                    employee.id,
                                    "employee_id",
                                    e.target.value
                                  )
                                : updateFormData(
                                    employee.id,
                                    "employee_id",
                                    e.target.value
                                  )
                            }
                            placeholder="Employee ID"
                            className="w-full px-2 py-1 border border-emerald-700 rounded text-sm 
                                       bg-black/60 text-emerald-50"
                          />
                        </td>
                        <td className="p-4">
                          <input
                            type="date"
                            value={formData[employee.id]?.hire_date || ""}
                            onChange={(e) =>
                              autoSaveEnabled
                                ? updateFormDataWithAutoSave(
                                    employee.id,
                                    "hire_date",
                                    e.target.value
                                  )
                                : updateFormData(
                                    employee.id,
                                    "hire_date",
                                    e.target.value
                                  )
                            }
                            className="w-full px-2 py-1 border border-emerald-700 rounded text-sm 
                                       bg-black/60 text-emerald-50 focus:ring-2 focus:ring-DivuLightGreen"
                          />
                        </td>
                        <td className="p-4">
                          <select
                            value={formData[employee.id]?.department || ""}
                            onChange={(e) =>
                              autoSaveEnabled
                                ? updateFormDataWithAutoSave(
                                    employee.id,
                                    "department",
                                    e.target.value
                                  )
                                : updateFormData(
                                    employee.id,
                                    "department",
                                    e.target.value
                                  )
                            }
                            className="w-full px-2 py-1 border border-emerald-700 rounded text-sm 
                                       bg-black/60 text-emerald-50 focus:ring-2 focus:ring-DivuLightGreen"
                          >
                            <option value="">Select...</option>
                            <option value="Technology">Technology</option>
                            <option value="Human Resources">
                              Human Resources
                            </option>
                            <option value="Marketing">Marketing</option>
                            <option value="Sales">Sales</option>
                            <option value="Finance">Finance</option>
                            <option value="Operations">Operations</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <input
                            type="text"
                            value={formData[employee.id]?.position || ""}
                            onChange={(e) =>
                              autoSaveEnabled
                                ? updateFormDataWithAutoSave(
                                    employee.id,
                                    "position",
                                    e.target.value
                                  )
                                : updateFormData(
                                    employee.id,
                                    "position",
                                    e.target.value
                                  )
                            }
                            placeholder="Job Title"
                            className="w-full px-2 py-1 border border-emerald-700 rounded text-sm 
                                       bg-black/60 text-emerald-50 focus:ring-2 focus:ring-DivuLightGreen"
                          />
                        </td>
                        <td className="p-4">
                          <input
                            type="text"
                            value={formData[employee.id]?.manager || ""}
                            onChange={(e) =>
                              autoSaveEnabled
                                ? updateFormDataWithAutoSave(
                                    employee.id,
                                    "manager",
                                    e.target.value
                                  )
                                : updateFormData(
                                    employee.id,
                                    "manager",
                                    e.target.value
                                  )
                            }
                            placeholder="Manager Name"
                            className="w-full px-2 py-1 border border-emerald-700 rounded text-sm 
                                       bg-black/60 text-emerald-50 focus:ring-2 focus:ring-DivuLightGreen"
                          />
                        </td>
                        <td className="p-4">
                          <select
                            value={
                              formData[employee.id]?.employment_type || ""
                            }
                            onChange={(e) =>
                              autoSaveEnabled
                                ? updateFormDataWithAutoSave(
                                    employee.id,
                                    "employment_type",
                                    e.target.value
                                  )
                                : updateFormData(
                                    employee.id,
                                    "employment_type",
                                    e.target.value
                                  )
                            }
                            className="w-full px-2 py-1 border border-emerald-700 rounded text-sm 
                                       bg-black/60 text-emerald-50 focus:ring-2 focus:ring-DivuLightGreen"
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
                            value={formData[employee.id]?.salary || ""}
                            onChange={(e) =>
                              autoSaveEnabled
                                ? updateFormDataWithAutoSave(
                                    employee.id,
                                    "salary",
                                    e.target.value
                                  )
                                : updateFormData(
                                    employee.id,
                                    "salary",
                                    e.target.value
                                  )
                            }
                            placeholder="Annual Salary"
                            className="w-full px-2 py-1 border border-emerald-700 rounded text-sm 
                                       bg-black/60 text-emerald-50 focus:ring-2 focus:ring-DivuLightGreen"
                            min="0"
                            step="1000"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEmployment(employee.id)}
                              className="px-3 py-1 bg-DivuDarkGreen text-white rounded text-sm 
                                         hover:bg-DivuBlue hover:text-black"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => cancelEditing(employee.id)}
                              className="px-3 py-1 bg-black/70 text-emerald-50 rounded text-sm 
                                         hover:bg-black"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 text-sm text-emerald-50">
                          {employee.employee_id || (
                            <span className="text-red-400">Not assigned</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-emerald-50">
                          {employee.hire_date ? (
                            new Date(employee.hire_date).toLocaleDateString()
                          ) : (
                            <span className="text-red-400">Not set</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-emerald-50">
                          {employee.department || (
                            <span className="text-red-400">Not assigned</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-emerald-50">
                          {employee.position || (
                            <span className="text-red-400">Not assigned</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-emerald-50">
                          {employee.manager || (
                            <span className="text-red-400">Not assigned</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-emerald-50">
                          {employee.employment_type || (
                            <span className="text-red-400">Not set</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-emerald-50">
                          {employee.salary ? (
                            `$${employee.salary.toLocaleString()}/year`
                          ) : (
                            <span className="text-orange-400">
                              Not specified
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => startEditing(employee)}
                            className="px-3 py-1 bg-DivuDarkGreen text-white rounded text-sm 
                                       hover:bg-DivuBlue hover:text-black"
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
            <p className="text-emerald-100/80">No employees found</p>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-black rounded-xl p-6 max-w-md mx-4 shadow-2xl border border-DivuDarkGreen">
              <h3 className="text-lg font-semibold text-DivuWhite mb-3">
                Confirm Action
              </h3>
              <p className="text-emerald-100 mb-6">{pendingAction?.message}</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-emerald-100 bg-black/60 border border-emerald-500 rounded-lg 
                             hover:bg-black transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 text-white bg-DivuDarkGreen rounded-lg 
                             hover:bg-DivuBlue hover:text-black transition-colors"
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
