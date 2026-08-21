(function(){
  window.MHRReportService = {
    async getReportsOrdered(client){
      var resp = await client.from('reports').select('*').order('created_at', { ascending: false });
      if (resp.error) throw resp.error;
      return resp.data || [];
    },
    async recoverMissingReportPdfUrls(client, reports){
      reports = Array.isArray(reports) ? reports : [];
      var pendingFolios = Object.create(null);
      reports.forEach(function(report){
        var folio = String((report && report.folio) || '').trim();
        if (report && !report.pdf_url && folio) pendingFolios[folio] = true;
      });
      if (Object.keys(pendingFolios).length === 0) return reports;

      var filesByFolio = Object.create(null);
      var pageSize = 1000;
      var maxPages = 5;
      for (var page = 0; page < maxPages && Object.keys(pendingFolios).length > 0; page++) {
        var listResp = await client.storage.from('reports').list('', {
          limit: pageSize,
          offset: page * pageSize,
          sortBy: { column: 'created_at', order: 'desc' }
        });
        if (listResp.error) {
          console.warn('[MHRReportService] No se pudo listar el bucket reports:', listResp.error);
          return reports;
        }

        var files = Array.isArray(listResp.data) ? listResp.data : [];
        files.forEach(function(file){
          var name = String((file && file.name) || '');
          if (name.indexOf('report_') !== 0 || !name.endsWith('.pdf')) return;
          var body = name.slice('report_'.length, -'.pdf'.length);
          var separator = body.lastIndexOf('_');
          if (separator <= 0 || !/^\d+$/.test(body.slice(separator + 1))) return;
          var folio = body.slice(0, separator);
          if (pendingFolios[folio] && !filesByFolio[folio]) {
            filesByFolio[folio] = file;
            delete pendingFolios[folio];
          }
        });
        if (files.length < pageSize) break;
      }

      reports.forEach(function(report){
        if (!report || report.pdf_url) return;
        var folio = String(report.folio || '').trim();
        var file = filesByFolio[folio];
        if (!file) return;
        var publicResp = client.storage.from('reports').getPublicUrl(file.name);
        var publicUrl = publicResp && publicResp.data && publicResp.data.publicUrl;
        if (publicUrl) report.pdf_url = publicUrl;
      });
      return reports;
    },
    async getReportsWithItemsOrdered(client){
      // Reportes con sus items (sin fotos) para análisis estadístico
      var resp = await client
        .from('reports')
        .select('id, folio, fecha_local, created_at, tipo_inspeccion, turno, pista, responsable, pdf_url, estatus, observacion, report_inspection_items(id, item_nombre, hallazgo, condicion, prioridad, lugar, codigo_seguimiento, datos_extra)')
        .order('created_at', { ascending: false });
      if (resp.error) throw resp.error;
      return resp.data || [];
    },
    async insertReport(client, payload){
      return await client.from('reports').insert([payload]).select();
    },
    async insertReportSingle(client, payload){
      return await client.from('reports').insert([payload]).select().single();
    },
    async insertReportItems(client, itemsPayload){
      return await client.from('report_inspection_items').insert(itemsPayload).select();
    },
    async insertItemPhoto(client, payload){
      return await client.from('report_inspection_item_photos').insert([payload]);
    },
    async insertItemPhotosBulk(client, payloads){
      return await client.from('report_inspection_item_photos').insert(payloads);
    },
    async getReportWithInspectionData(client, reportId){
      return await client
        .from('reports')
        .select('*, report_inspection_items(*, report_inspection_item_photos(*))')
        .eq('id', reportId)
        .single();
    },
    async getReportWithInspectionDataHydrated(client, reportId){
      var resp = await this.getReportWithInspectionData(client, reportId);
      if (resp.error || !resp.data) return resp;
      var report = resp.data;
      var items = Array.isArray(report.report_inspection_items) ? report.report_inspection_items : [];
      items.forEach(function(item){
        var photos = Array.isArray(item.report_inspection_item_photos) ? item.report_inspection_item_photos : [];
        photos.forEach(function(photo){
          var bucket = photo.bucket || 'report-evidencias';
          var storagePath = photo.storage_path || '';
          var publicData = client.storage.from(bucket).getPublicUrl(storagePath);
          photo.public_url = publicData && publicData.data ? publicData.data.publicUrl : null;
        });
      });
      return { data: report, error: null };
    },
    async uploadToBucket(client, bucket, filename, blob, options){
      return await client.storage.from(bucket).upload(filename, blob, options || {});
    },
    getPublicUrl(client, bucket, filePath){
      return client.storage.from(bucket).getPublicUrl(filePath);
    },
    async getLatestReportByPista(client, pista){
      // Obtener el último reporte para una pista específica con ítems y fotos
      try {
        var resp = await client
          .from('reports')
          .select('*, report_inspection_items(*, report_inspection_item_photos(*))')
          .eq('pista', pista)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (resp.data && Array.isArray(resp.data.report_inspection_items)) {
          // Filtrar ítems atendidos e ítem virtual de firmas
          resp.data.report_inspection_items = resp.data.report_inspection_items.filter(function(item) {
            try {
              return item.item_nombre !== '__firmas__'
                && (item.datos_extra || {}).followup_status !== 'Atendido satisfactoriamente';
            } catch (e) { return true; }
          });

          // Generar signed URLs en paralelo para todas las fotos (no requiere bucket público)
          var signTasks = [];
          resp.data.report_inspection_items.forEach(function(item) {
            var photos = Array.isArray(item.report_inspection_item_photos) ? item.report_inspection_item_photos : [];
            photos.forEach(function(photo) {
              if (!photo.storage_path) { photo.public_url = null; return; }
              var bucket = photo.bucket || 'report-evidencias';
              signTasks.push(
                client.storage.from(bucket).createSignedUrl(photo.storage_path, 3600)
                  .then(function(res) { photo.public_url = res.data ? res.data.signedUrl : null; })
                  .catch(function() { photo.public_url = null; })
              );
            });
          });
          if (signTasks.length > 0) await Promise.all(signTasks);
        }

        return resp;
      } catch (e) {
        return { data: null, error: e };
      }
    }
  };
})();
