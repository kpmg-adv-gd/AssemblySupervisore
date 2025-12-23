sap.ui.define([
	'jquery.sap.global',
	"sap/ui/model/json/JSONModel",
	"./BaseController",
	"../utilities/CommonCallManager"
], function (jQuery, JSONModel, BaseController, CommonCallManager) {
	"use strict";

	return BaseController.extend("kpmg.custom.tile.supervisoreAssembly.supervisoreAssembly.controller.DetailView", {
		oDetailModel: new JSONModel(),
		lastRefresh: false,

		onInit: function () {
			this.getView().setModel(this.oDetailModel, "DetailModel");

			// Variabile per tracciare il parametro corrente per il commento
			this._currentCommentItem = null;
		},

		onNavigateTo: function (oEvent) {
			var that = this;
			var selected = that.getInfoModel().getProperty("/selectedRow");
			that.oDetailModel.setProperty("/selectedRow", selected)
			// Imposta i dati nelle tabelle
			that.byId("groupsTable").removeSelections();
			that.oDetailModel.setProperty("/groupsData", []);
			that.oDetailModel.setProperty("/parameteresData", []);
			that.oDetailModel.setProperty("/ncTableData", []);
			that.oDetailModel.setProperty("/resultsTableData", []);
			that.oDetailModel.setProperty("/listIdReportWeight", []);
			that.oDetailModel.setProperty("/viewCustomTableNC", false);
			that.oDetailModel.setProperty("/viewVotoSezione", false);
			that.oDetailModel.setProperty("/viewCustomTableResults", false);
			that.oDetailModel.setProperty("/selectedGroup", undefined);
			that.loadGroups(selected, false);
			that.loadReportWeight();
			that.loadCustomTableNC();
		},

		// Carico Data Collection - tabella sx
		loadGroups: function (selected, refresh) {
			var that = this;
			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/api/getDataCollectionsBySFC";
			let url = BaseProxyURL + pathOrderBomApi;
			this.lastRefresh = refresh;

			var plant = that.getInfoModel().getProperty("/plant");

			let params = {
				plant: plant,
				selected: selected,
				resource: "REPORT_ASSEMBLY",
				refresh: refresh
			};

			// Callback di successo
			var successCallback = function (response) {
				this.oDetailModel.setProperty("/groupsData", response)
				if (response.length == 0) that.showErrorMessageBox(that.getI18n("msg.dc.empty"))
				var selectedGroup = that.oDetailModel.getProperty("/selectedGroup");
				if (selectedGroup) {
					var selectedUpdated = response.filter(item => item.group == selectedGroup.group);
					if (selectedUpdated.length > 0) that.onSelectGroup(undefined, selectedUpdated[0]);
				}
				that.oDetailModel.setProperty("/BusyLoadingOpTable", false);
			}
			// Callback di errore
			var errorCallback = function (error) {
				that.showErrorMessageBox(error);
				that.oDetailModel.setProperty("/BusyLoadingOpTable", false);
			};

			that.oDetailModel.setProperty("/BusyLoadingOpTable", true);
			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		},

		// Selezione di una Data Collection
		onSelectGroup: function (oEvent, selected) {
			var that = this;
			var selectedObject = oEvent ? oEvent.getParameter("listItem").getBindingContext("DetailModel").getObject() : selected;
			that.oDetailModel.setProperty("/selectedGroup", selectedObject);
			// Caricamento tabelle custom
			if (selectedObject.viewCustomTableNC) {
				that.oDetailModel.setProperty("/viewCustomTableNC", true);
				that.oDetailModel.setProperty("/viewVotoSezione", true);
				that.oDetailModel.setProperty("/viewCustomTableResults", false);
				that.loadCustomTableNC(selectedObject);
				return;
			} else {
				that.oDetailModel.setProperty("/viewCustomTableNC", false);
				that.oDetailModel.setProperty("/viewVotoSezione", false);
			}
			if (selectedObject.viewCustomTableResults) {
				that.oDetailModel.setProperty("/ncTableResults", [])
				that.oDetailModel.setProperty("/viewCustomTableResults", true);
				that.loadReportWeight();
			} else {
				that.oDetailModel.setProperty("/viewCustomTableResults", false);
			}
			// Carico parametri
			that.loadParameters(selectedObject);
		},

		// Carico Parametri - tabella dx
		loadParameters: function (selectedGroup, votoSezione) {
			var that = this;
			that.oDetailModel.setProperty("/parameteresData", selectedGroup.parameters);
			if (selectedGroup.voteSection != null) {
				that.oDetailModel.setProperty("/viewVotoSezione", true);
				if (votoSezione && (selectedGroup.voteSection == "" || this.lastRefresh)) {
					that.oDetailModel.setProperty("/selectedGroup/voteSection", votoSezione);
					that.oDetailModel.getProperty("/groupsData").filter(item => item.group == selectedGroup.group)[0].voteSection = votoSezione;
					that.oDetailModel.refresh();
				}
				that.oDetailModel.setProperty("/ncVotoSezione", selectedGroup.voteSection)
				that.oDetailModel.setProperty("/voteNameSection", selectedGroup.voteNameSectionDesc);
			}else{
				that.oDetailModel.setProperty("/viewVotoSezione", false);
			}
		},

		loadCustomTableNC: function (selectedObject) {
			var that = this;
			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/db/getCustomTableNC";
			let url = BaseProxyURL + pathOrderBomApi;

			var plant = that.getInfoModel().getProperty("/plant");

			let params = {
				plant: plant,
				order: that.getInfoModel().getProperty("/selectedRow").order,
			};

			// Callback di successo
			var successCallback = function (response) {
				that.oDetailModel.setProperty("/ncTableData", response.results)
				if (selectedObject) that.loadParameters(selectedObject, response.votoSezione);
			}
			// Callback di errore
			var errorCallback = function (error) {
				that.showErrorMessageBox(error);
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		},
		loadReportWeight: function (refresh) {
			var that = this;
			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/db/getReportWeight";
			let url = BaseProxyURL + pathOrderBomApi;

			let params = {
				report: "Assembly",
			};

			// Callback di successo
			var successCallback = function (response) {
				var ids = []
				response.forEach(item => {
					if (ids.filter(id => id.id == item.id).length == 0) ids.push({ id: item.id });
				});
				that.oDetailModel.setProperty("/listIdReportWeight", ids);
				that.oDetailModel.setProperty("/listReportWeight", response);
				that.byId("idReportWeight").setSelectedKey(ids[0].id);
				that.loadCustomTableResults(ids[0].id);
			}
			// Callback di errore
			var errorCallback = function (error) {
				that.showErrorMessageBox(error);
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		},
		onIdWeightChange: function (oEvent) {
			var that = this;
			var id = that.byId("idReportWeight").getSelectedKey();
			if (id != "") {
				that.loadCustomTableResults(id);
			}
		},
		loadCustomTableResults: function (id) {
			var that = this;
			var datas = that.oDetailModel.getProperty("/listReportWeight").filter(item => item.id == id);
			// todo: qui ho sezione e peso ( mi manca il voto)
			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/api/getReportWeightDataCollections";
			let url = BaseProxyURL + pathOrderBomApi;

			var plant = that.getInfoModel().getProperty("/plant");
			var selected = that.oDetailModel.getProperty("/selectedRow")

			let params = {
				plant: plant,
				sfc: selected.sfc,
				resource: "REPORT_ASSEMBLY",
				listSection: datas
			};

			// Callback di successo
			var successCallback = function (response) {
				var totalWeight = 0, totalScore = 0;
				response.forEach(item => {
					// Calcolo descrizione
					if (that.oDetailModel.getProperty("/groupsData").filter(gp => gp.group == item.section).length > 0) {
						item.sectionDesc = that.oDetailModel.getProperty("/groupsData").filter(gp => gp.group == item.section)[0].description;
					}else{
						item.sectionDesc = item.section;
					}
					// Calcolo totale
					try {
						item.vote = that.oDetailModel.getProperty("/groupsData").filter(gp => gp.group == item.section)[0].voteSection;
						totalWeight += Number(item.weight.split("%")[0]);
						totalScore += Number(item.weight.split("%")[0]) * Number(item.vote);
					} catch (e) {}
				});
				response[response.length-1].vote = (totalScore / totalWeight).toFixed(2);
				that.oDetailModel.setProperty("/resultsTableData", response)
			}
			// Callback di errore
			var errorCallback = function (error) {
				that.showErrorMessageBox(error);
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		},

		onNavBack: function () {
			var that = this;			
			var reportStatus = that.oDetailModel.getProperty("/selectedRow").reportStatus;
			if (reportStatus == "DONE") {
				sap.ui.getCore().getEventBus().publish("TileViewMessage", "refreshModel", null);
				that.navToTileView();
			}else{
				sap.m.MessageBox.confirm(
					that.getI18n("msg.navBack.confirm"),
					{
						title: that.getI18n("msg.navBack.title"),
						onClose: function (oAction) {
							if (oAction === sap.m.MessageBox.Action.OK) {
								sap.ui.getCore().getEventBus().publish("TileViewMessage", "refreshModel", null);
								that.navToTileView();
							}
						}
					}
				);
			}
		},

		onRefreshPress: function () {
			var that = this;
			sap.m.MessageBox.confirm(
				that.getI18n("msg.navBack.confirm"),
				{
					title: that.getI18n("msg.navBack.title"),
					onClose: function (oAction) {
						if (oAction === sap.m.MessageBox.Action.OK) {
							that.oDetailModel.setProperty("/parameteresData", []);
							that.oDetailModel.setProperty("/viewVotoSezione", false);
							var selected = that.getInfoModel().getProperty("/selectedRow");
							that.loadGroups(selected, true);
						}
					}
				}
			);
		},

		onCommentPress: function (oEvent) {
			var selectedObject = oEvent.getSource().getBindingContext("DetailModel").getObject();
			this._currentCommentItem = oEvent.getSource().getBindingContext("DetailModel");

			// Apri il dialog del commento
			var oDialog = this.byId("commentDialog");
			var oTextArea = this.byId("commentTextArea");

			// Carica il commento esistente se presente
			var sExistingComment = selectedObject.comment;
			oTextArea.setValue(sExistingComment || "");

			oDialog.open();
		},

		onSaveComment: function () {
			var that = this;
			var oTextArea = this.byId("commentTextArea");
			var sComment = oTextArea.getValue();
			if (this._currentCommentItem) {
				// Salva il commento nel modello
				var sPath = this._currentCommentItem.getPath() + "/comment";
				that.oDetailModel.setProperty(sPath, sComment);
				that.oDetailModel.setProperty(sPath, sComment);
				sap.m.MessageToast.show(that.getI18n("msg.comment.saved"));
			}
			this.byId("commentDialog").close();
		},

		onCancelComment: function () {
			this.byId("commentDialog").close();
		},

		onVotoSezioneChange: function (oEvent) {
			var that = this;
			var newValue = oEvent.getParameter("value");
			var selectedGroup = that.oDetailModel.getProperty("/selectedGroup");
			
			if (selectedGroup) {
				// Aggiorna il valore nel gruppo selezionato
				selectedGroup.voteSection = newValue;
				
				// Trova e aggiorna anche nel groupsData
				var groupsData = that.oDetailModel.getProperty("/groupsData");
				for (var i = 0; i < groupsData.length; i++) {
					if (groupsData[i].group === selectedGroup.group) {
						groupsData[i].voteSection = newValue;
						break;
					}
				}
			}
		},

		onValueChange: function (oEvent) {
			var oSelect = oEvent.getSource();
			var sNewValue = oSelect.getSelectedKey();
			var oContext = oSelect.getBindingContext();
			var sParametro = oContext.getProperty("parametro");

			sap.m.MessageToast.show(that.getI18n("msg.value.updated"));
		},

		onSavePress: function () {
			this.onSave(true);
		},

		onSave: function (onlySave) {
			var that = this;
			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/api/saveDataCollections";
			let url = BaseProxyURL + pathOrderBomApi;

			var plant = that.getInfoModel().getProperty("/plant");
			var selected = that.oDetailModel.getProperty("/selectedRow");
			var datas = that.oDetailModel.getProperty("/groupsData");

			let params = {
				plant: plant,
				order: selected.order,
				sfc: selected.sfc,
				resource: "REPORT_ASSEMBLY",
				dataCollections: datas,
				passInWork: onlySave && that.oDetailModel.getProperty("/selectedRow/reportStatus") != "IN_WROK"
			};

			// Callback di successo
			var successCallback = function (response) {
				if (onlySave) {
					sap.m.MessageToast.show(that.getI18n("msg.data.saved"));
					that.oDetailModel.setProperty("/groupsData", []);
					that.oDetailModel.setProperty("/parameteresData", []);
					that.oDetailModel.setProperty("/viewVotoSezione", false);
					that.loadGroups(selected, false);
					that.oDetailModel.setProperty("/selectedRow/reportStatus", "IN_WORK");
				}
				sap.ui.core.BusyIndicator.hide();
			}

			// Callback di errore
			var errorCallback = function (error) {
				var message = "";
				for (var i = 0;i<error.length;i++) message += "\n" + error[i].dc + ":" +  error[i].message;
				that.showErrorMessageBox(message);
				if (onlySave) {
					sap.m.MessageToast.show(that.getI18n("msg.data.saved"));
					that.oDetailModel.setProperty("/groupsData", []);
					that.oDetailModel.setProperty("/parameteresData", []);
					that.oDetailModel.setProperty("/viewVotoSezione", false);
					that.loadGroups(selected, false);
					that.oDetailModel.setProperty("/selectedRow/reportStatus", "IN_WORK");
				}
				sap.ui.core.BusyIndicator.hide();
			};

			sap.ui.core.BusyIndicator.show(0);
			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		},

		onGenerateInspectionPress: function () {
			// Genera il documento di ispezione
			var that = this;
			sap.m.MessageBox.confirm(
				that.getI18n("msg.inspection.confirm"),
				{
					title: that.getI18n("msg.inspection.title"),
					onClose: function (oAction) {
						if (oAction === sap.m.MessageBox.Action.OK) {
							that.onSave(false);
							that.generateInspection();
						}
					}
				}
			);
		},

		generateInspection: function () {
			var that = this;
			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/api/generateInspection";
			let url = BaseProxyURL + pathOrderBomApi;

			var plant = that.getInfoModel().getProperty("/plant");
			var dataCollections = that.oDetailModel.getProperty("/groupsData");
			var ncCustomTable = that.oDetailModel.getProperty("/ncTableData");
			var resultCustomTable = that.oDetailModel.getProperty("/resultsTableData");
			var selected = that.oDetailModel.getProperty("/selectedRow");

			let params = {
				plant: plant,
				user: that.getInfoModel().getProperty("/user_id"),
				selectedData: selected,
				dataCollections: dataCollections,
				ncCustomTable: ncCustomTable,
				resultCustomTable: resultCustomTable
			};

			// Callback di successo
			var successCallback = function (response) {
				sap.m.MessageToast.show(that.getI18n("msg.inspection.saved"));
				that.oDetailModel.setProperty("/groupsData", []);
				that.oDetailModel.setProperty("/parameteresData", []);
				that.oDetailModel.setProperty("/viewVotoSezione", false);
				that.oDetailModel.setProperty("/selectedRow/reportStatus", "DONE");
				that.loadGroups(selected, false);
				sap.ui.core.BusyIndicator.hide();
			}

			// Callback di errore
			var errorCallback = function (error) {
				that.showErrorMessageBox(error);
				sap.ui.core.BusyIndicator.hide();
			};

			sap.ui.core.BusyIndicator.show(0);
			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		},

		onDownloadReportPDF: function () {
			var that = this;
			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/api/downloadVerbalePDF";
			let url = BaseProxyURL + pathOrderBomApi;

			var plant = that.getInfoModel().getProperty("/plant");
			var selected = this.oDetailModel.getProperty("/selectedRow");

			let params = {
				plant: plant,
				sfc: selected.sfc,
			};

			// Callback di successo
			var successCallback = function (response) {
				try {
					var pdfBase64 = response.base64;
					var byteCharacters = atob(pdfBase64);
					var byteNumbers = new Array(byteCharacters.length).fill().map((_,i)=>byteCharacters.charCodeAt(i));
					var byteArray = new Uint8Array(byteNumbers);
					var blob = new Blob([byteArray], { type: "application/pdf" });

					var url = URL.createObjectURL(blob);
					var link = document.createElement("a");
					link.href = url;
					//link.download = "verbale_" + selected.sfc + + "_" + new Date().toISOString().slice(0,10) + ".pdf";
					//link.click();
					window.open(url, "_blank");
				} catch (e) { console.log (e.message) }
			}
			// Callback di errore
			var errorCallback = function (error) {
				that.showErrorMessageBox(error);
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		
		},

	});
});