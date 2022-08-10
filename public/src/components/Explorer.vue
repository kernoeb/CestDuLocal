<script setup>
import {onMounted, ref} from "vue";

import ky from 'ky'
import fileSize from 'filesize'

const props = defineProps({
  api: {
    type: String,
    default: 'http://localhost:3000'
  }
})

let files = ref([])
let currentP = ref(null)

const refresh = async () => {
  await fetchFiles(currentP.value)
}

const fetchFiles = async (p = '/') => {
  const response = await ky.get(props.api + '/api/explorer', {
    searchParams: { p }
  }).json()
  currentP.value = p
  let tmp = response.files
  if (response.parent) tmp = [{name: '..', oldPath: response.parent, directory: true}, ...tmp]
  files.value = tmp
}

const dlFile = (file) => {
  window.open(file, '_blank')
}

onMounted(async () => {
  await fetchFiles()
})

defineExpose({
  refresh
})

const rowClick = (file) => {
  if (file.oldPath) fetchFiles(file.oldPath)
  else if (file.directory) fetchFiles(file.relative)
  else dlFile(props.api + '/served' + file.relative.split("/").map(encodeURIComponent).join("/"))
}
</script>

<script>
export default defineComponent({
  components: {
    IconEpFolder,
    IconEpDocument
  }
})
</script>

<template>
  <el-card>
    <el-table :data="files" style="width: 100%" @row-click="rowClick" height="500">
      <el-table-column prop="name" label="Nom du fichier">
        <template #default="{row}">
          <div style="display: flex; align-items: center">
            <IconEpFolder color="green" v-if="row.directory" />
            <IconEpDocument v-else />
            <span style="margin-left: 10px">{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="size" label="Taille du fichier" width="180">
        <template #default="{row}">
          <span v-if="row.directory"></span>
          <span v-else-if="row.size != null">{{ fileSize(row.size) }}</span>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
