sap.ui.define([
	"sap/ui/core/mvc/Controller"
],
	function (Controller) {
		"use strict";

		return Controller.extend("zui5buchusercrud.controller.main", {
			onInit: function () {


				this._oModel = this.getOwnerComponent().getModel();

				// Save reference to the table for later use
				this._oTable = this.getView().byId("userTable");
			},

			// Search function
			onSearch: function (oEvent) {
				var filterValue = oEvent.getSource().getValue();
				var oBinding = this.byId("userTable").getBinding("items");

				if (filterValue.trim() != '') {
					var oFilter = new sap.ui.model.Filter("Lname",
						sap.ui.model.FilterOperator.StartsWith, filterValue);
					oBinding.filter([oFilter]);
				} else {
					oBinding.filter();
				}
			},

			// Filter-Popup
			onViewSettingsDialogPressed: function (oEvent) {
				if (!this._oSettingDialog) {
					this._oSettingDialog = sap.ui.xmlfragment(
						"zui5buchusercrud.view.fragment.TableViewSettingsDialog", this);
				}
				this._oSettingDialog.open();
			},

			// Get Filter from Filter-Popup
			handleConfirm: function (oEvent) {
				// Get Binding of Table
				var oBinding = this.getView().byId("userTable").getBinding("items");

				// Get Parameter from Event-Object
				var mParams = oEvent.getParameters();
				var sPath = mParams.sortItem.getKey();
				var bDescending = mParams.sortDescending;

				// ... set parameter to sort function
				var aSorters = [];
				aSorters.push(new sap.ui.model.Sorter(sPath, bDescending));
				oBinding.sort(aSorters);

			},

			// cleanup internal references when the controller is about to get destroyed
			onExit: function () {
				this._destroySth(this._oModel);
				this._destroySth(this._oEditModel);
				this._destroySth(this._oViewModel);
				this._destroySth(this._oDialog);
				// table as a sub-control is destroyed by the view itself, no need for
				// explicit destroy
				delete this._oTable;
			},
			/* _destroySth : function(oSth) {
				if (oSth) {
					oSth.destroy();
				}
				delete oSth;
			}, */

			// Create ///////////////////////////////////////////////////

			onCreatePressed: function () {
				this.openUserDialog();
			},

			createUser: function () {
				var that = this, oEntry = this._oEditModel.getData();

				this._oModel.create("/UserSet", oEntry, {
					success: function () {
						that._oDialog.close();
						sap.m.MessageToast.show("User created successfully");
					},
					error: function (oError) {
						that._oDialog.close();
						that._displayMessage(oError.response.body);
					}
				});
			},

			// Update //////////////////////////////////////////////////////////

			onUpdatePressed: function () {
				var oUser = this.getSelectedUser();
				if (oUser) {
					this.openUserDialog(oUser);
				}
			},

			updateUser: function () {
				var that = this, 
				    oEntryEditModel = this._oEditModel.getData(),
					sEntityPath = "/Employees(" + oEntryEditModel.EmployeeID + ")",
					oEntry = {};

					oEntry.EmployeeID = oEntryEditModel.EmployeeID;
					oEntry.FirstName  = oEntryEditModel.FirstName;

				this._oModel.update(sEntityPath, oEntry, {
					success: function () {
						that._oDialog.close();
						sap.m.MessageToast.show("User updated successfully");
					},
					error: function (oError) {
						that._oDialog.close();
						//that._displayMessage(oError.response.body);
						sap.m.MessageBox.error(oError.responseText);
					}
				});
			},

			// Delete User //////////////////////////////////////////////////////

			onDeletePressed: function () {
				var oUser = this.getSelectedUser();
				if (oUser) {
					this.openDeleteUserDialog(oUser);
				}
			},

			openDeleteUserDialog: function (oUser) {
				jQuery.sap.require("sap.m.MessageBox");
				sap.m.MessageBox.confirm("Do you really want do delete User '"
					+ oUser.Userid + "'?", {
					title: "Delete User",
					// ensure that this.deleteUser is called with the right context
					// (this)
					onClose: jQuery.proxy(this.deleteUser, this)
				});
			},

			deleteUser: function (sAction, asd, asdd, ade) {
				if (sAction !== sap.m.MessageBox.Action.OK) {
					return;
				}

				var oEntry = this.getSelectedUser();
				this._oModel.remove("/UserSet('" + oEntry.Userid + "')", {
					success: function () {
						sap.m.MessageToast.show("User deleted successfully");
					},
					error: function (oError) {
						that._displayMessage(oError.response.body);
					}
				});
			},

			// Helper /////////////////////////////////////////////////////////

			createUserDialog: function () {
				var oDialog = sap.ui.xmlfragment("zui5buchusercrud.view.fragment.EditUser", this);
				this.getView().addDependent(oDialog);

				// create local edit model to transfer table data into dialog and detach
				// it from the main model for temporary editing
				if (!this._oEditModel) {
					this._oEditModel = new sap.ui.model.json.JSONModel();
				}
				// create a view model to control appearance of new/edit dialog
				if (!this._oViewModel) {
					this._oViewModel = new sap.ui.model.json.JSONModel();
				}
				oDialog.setModel(this._oEditModel, "edit");
				oDialog.setModel(this._oViewModel, "view");

				return oDialog;
			},

			openUserDialog: function (oUser) {
				// save dialog reference for later usage
				if (!this._oDialog) {
					this._oDialog = this.createUserDialog();
				}

				// setup dialog models
				this._oEditModel.setProperty("/", oUser || {});
				// Note: !! is a duplicate negation in order to get a boolean result:
				// sth negates to false negates to true
				// undefined negates to true negates to false
				this._oViewModel.setProperty("/edit", !!oUser);

				this._oDialog.open();
			},

			onDialogCancel: function () {
				this._oDialog.close();
			},

			onDialogConfirm: function (oEv) {
				if (oEv.getSource().data("edit")) {
					this.updateUser();
				} else {
					this.createUser();
				}
				this._oDialog.close();
			},

			getSelectedUser: function () {
				var aSelectedContexts = this._oTable.getSelectedContexts();
				if (aSelectedContexts.length === 1) {
					return aSelectedContexts[0].getObject();
				}

				// Handle no selection
				sap.m.MessageToast.show("Please select a User");
				return;
			},

			_displayMessage: function (oError) {

				var messageText;

				try {
					// Try to parse as a JSON string
					oMessage = JSON.parse(oError);
				} catch (err) {
					try {
						switch (typeof oError) {
							case "string": // XML or simple text
								if (oError.indexOf("<?xml") == 0) {
									var oXML = jQuery.parseXML(oError);
									var oXMLMsg = oXML.querySelector("message");
									if (oXMLMsg) {
										messageText = oXMLMsg.textContent;
									}
								} else {
									// Nope just return the string
									messageText = oError;
								}
								break;

							case "object": // Exception
								messageText = oError.toString();
								break;
						}
					} catch (err) {
						messageText = "An unknown error occurred";
					}

					sap.m.MessageBox.error(messageText);

				}
			},

			// Formatter //////////////////////////////////////////////////////

			// return title depending on the dialog mode
			formatDialogTitle: function (bEdit) {
				return bEdit ? "Update User" : "Create New User";
			},

			not: function (val) {
				return !val;
			}
		});
	});
