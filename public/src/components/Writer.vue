<script setup>
defineProps({
  text: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <el-card>
    <el-input
        :model-value="text"
        :autosize="{ minRows: 3, maxRows: 10 }"
        id="writer-input"
        placeholder="Saisissez votre texte ici"
        type="textarea"
        @update:modelValue="$emit('update-text', $event)"
    />
  </el-card>
</template>
