// src/pages/Sources.jsx
import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  message,
  Popconfirm,
  Upload,
  Space,
  Spin
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { supabase } from "../utils/supabaseClient";

const { Option } = Select;

function parseTagsInput(input) {
  if (!input) return [];
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function Sources() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSources();
  }, []);

  async function fetchSources() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      message.error(error.message);
      return;
    }
    setData(data);
  }

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(record) {
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      type: record.type,
      file_url: record.file_url || "",
      language: record.language || "Hindi",
      tags: (record.tags || []).join(", "),
    });
    setModalOpen(true);
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("sources").delete().eq("id", id);
    if (error) return message.error(error.message);
    message.success("Deleted");
    fetchSources();
  }

  // Optional: upload file to Supabase Storage bucket "sources-pdfs"
  async function uploadFile(file) {
    // ensure bucket exists and has public access or proper signed URL strategy
    const bucket = "sources-pdfs";
    const filePath = `${Date.now()}_${file.name}`;
    setUploading(true);
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: false });
    setUploading(false);
    if (error) {
      message.error("Upload failed: " + error.message);
      return null;
    }
    // generate public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  async function onFinish(values) {
    let payload = {
      title: values.title,
      type: values.type,
      file_url: values.file_url || null,
      language: values.language || "Hindi",
      tags: parseTagsInput(values.tags),
    };

    try {
      // if a File object was provided via upload component, handle it
      if (values._uploadedFile && values._uploadedFile instanceof File) {
        const publicUrl = await uploadFile(values._uploadedFile);
        if (publicUrl) payload.file_url = publicUrl;
      }

      if (editing) {
        const { error } = await supabase
          .from("sources")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        message.success("Updated source");
      } else {
        const { data: created, error } = await supabase
          .from("sources")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        message.success("Created source");
      }
      setModalOpen(false);
      fetchSources();
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  }

  const columns = [
    { title: "Title", dataIndex: "title", key: "title" },
    { title: "Type", dataIndex: "type", key: "type" },
    { title: "Language", dataIndex: "language", key: "language" },
    {
      title: "Tags",
      dataIndex: "tags",
      key: "tags",
      render: (tags) =>
        tags && tags.length ? tags.map((t) => <Tag key={t}>{t}</Tag>) : null,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button onClick={() => openEdit(record)}>Edit</Button>
          <Popconfirm
            title="Delete this source?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={openCreate}>
          Add Source
        </Button>
        <Button style={{ marginLeft: 8 }} onClick={fetchSources}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <Spin />
      ) : (
        <Table dataSource={data} columns={columns} rowKey="id" />
      )}

      <Modal
        title={editing ? "Edit Source" : "Add Source"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select>
              <Option value="book">Book</Option>
              <Option value="video">Video</Option>
            </Select>
          </Form.Item>

          <Form.Item name="file_url" label="File URL (or upload below)">
            <Input />
          </Form.Item>

          <Form.Item
            label="Upload PDF (optional)"
            name="_uploadedFile"
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              // store raw File object to values._uploadedFile
              if (!e) return undefined;
              const file = e.file.originFileObj || e.file;
              // AntD expects fileList but we store File to be uploaded on submit
              form.setFieldsValue({ _uploadedFile: file });
              return file;
            }}
          >
            <Upload
              accept="application/pdf"
              beforeUpload={() => false} // prevent auto upload
              maxCount={1}
              showUploadList={true}
            >
              <Button icon={<UploadOutlined />} loading={uploading}>
                Select PDF
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item name="language" label="Language" initialValue="Hindi">
            <Input />
          </Form.Item>

          <Form.Item name="tags" label="Tags (comma separated)">
            <Input placeholder="e.g. दर्शन, जीवन" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button htmlType="submit" type="primary">
                {editing ? "Update" : "Create"}
              </Button>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

