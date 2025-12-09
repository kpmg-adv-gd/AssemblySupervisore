sap.ui.define([
    'jquery.sap.global',
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    "./BaseController",
    "../utilities/CommonCallManager"
], function (jQuery, JSONModel, Filter, FilterOperator, BaseController, CommonCallManager) {
	"use strict";

	return BaseController.extend("kpmg.custom.tile.supervisoreAssembly.supervisoreAssembly.controller.TileView", {
        oTileModel: new JSONModel(),

		onInit: function () {
            this.getView().setModel(this.oTileModel, "TileModel");

            sap.ui.getCore().getEventBus().subscribe("TileViewMessage", "refreshModel", this.refreshModel, this);
		},

        onAfterRendering: function(){
            var that=this;
			that.getProjects();
        },

        refreshModel: function () {
            var that = this;
            that.oTileModel.refresh();
        },

        // Ottengo lista dei Progetti
        getProjects: function () {
            var that=this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathOrderBomApi = "/api/getProjectsVerbaliSupervisoreAssembly";
            let url = BaseProxyURL+pathOrderBomApi; 
            
            var plant = that.getInfoModel().getProperty("/plant");

            let params={
                plant: plant,
            };

            // Callback di successo
            var successCallback = function(response) {
                that.oTileModel.setProperty("/projects", response);
            }
            // Callback di errore
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
            };

            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
		// Ottengo Treetable
        loadData: function () {
            var that=this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathOrderBomApi = "/api/getVerbaliSupervisoreAssembly";
            let url = BaseProxyURL+pathOrderBomApi; 
            
            var plant = that.getInfoModel().getProperty("/plant");

            let params={
                plant: plant,
				project: that.byId("projectFilter").getSelectedKey(),
				wbs: that.byId("wbsFilter").getValue(),
                showAll: that.byId("showAllFilter").getSelected()
            };

            // Callback di successo
            var successCallback = function(response) {
            	that.oTileModel.setProperty("/BusyLoadingOpTable",false);
                that.oTileModel.setProperty("/treeData", response);
            }
            // Callback di errore
            var errorCallback = function(error) {
            	that.oTileModel.setProperty("/BusyLoadingOpTable",false);
                that.showErrorMessageBox(error);
            };

            that.oTileModel.setProperty("/BusyLoadingOpTable",true);
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },

		// Filtro dati
		onSearchPress: function() {
			var that = this;
			that.getProjects();
			that.loadData();
		},

		// Azzera filtri
		onClearPress: function() {
			var oView = this.getView();
			oView.byId("projectFilter").setValue("");
			oView.byId("wbsFilter").setValue("");
			var oTreeTable = oView.byId("treeTable");
			var oBinding = oTreeTable.getBinding("rows");
			oBinding.filter([]);
		},

		// Espandi tutti i nodi
		onExpandAll: function() {
			var oTreeTable = this.getView().byId("treeTable");
			oTreeTable.expandToLevel(10);
		},

		// Collassa tutti i nodi
		onCollapseAll: function() {
			var oTreeTable = this.getView().byId("treeTable");
			oTreeTable.collapseAll();
		},

		// Gestione selezione riga
		onRowSelectionChange: function(oEvent) {
			var that = this;
			var oTreeTable = oEvent.getSource();
			var iSelectedIndex = oTreeTable.getSelectedIndex();
			
			if (iSelectedIndex >= 0) {
				var oContext = oTreeTable.getContextByIndex(iSelectedIndex);
				var oSelectedData = oContext.getObject();
				
				// Verifica se è una riga figlia (ha SFC valorizzato)
				if (oSelectedData && oSelectedData.sfc) {
					that.getInfoModel().setProperty("/selectedRow", oSelectedData)
                	that.navToDetailView();
				}
			}
		},

		//formatter per collonna status (ICONA) front-end
        getStatusIcon: function (code) {
            switch (code) {
                case "NEW":
                    return "sap-icon://rhombus-milestone-2";
                case "IN_WORK":
                    return "sap-icon://circle-task-2";
                case "DONE":
                    return "sap-icon://complete";
                case "IN_QUEUE":
                    return "sap-icon://color-fill";
                default:
                    return "sap-icon://rhombus-milestone-2";
            }
        },
        getStatusColor: function (code) {
            switch (code) {
                case "NEW": // new
                    return "grey";
                case "IN_WORK": // in work
                    return "green"; // Blu
                case "DONE": // done
                    return "green"; // Verde
                case "IN_QUEUE":
                    return "blue"
                default:
                    return "grey"; // Colore di default
            }
        },
        getStatusIconVerbale: function (code) {
            switch (code) {
                case "IN_WORK":
                    return "sap-icon://lateness";
                case "DONE":
                    return "sap-icon://complete";
                default:
                    return "sap-icon://decline";
            }
        },
        getStatusColorVerbale: function (code) {
            switch (code) {
                case "IN_WORK": // in work
                    return "#FFBC00"; // Giallo
                case "DONE": // done
                    return "green"; // Verde
                default:
                    return "red"; // Colore di default
            }
        },

	});
});